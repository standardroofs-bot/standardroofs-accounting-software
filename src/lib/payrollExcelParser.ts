import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

export interface ParsedPayrollItem {
  employeeName: string;
  employeeCode: string;
  employeeId: string;
  category: "OFFICE" | "TAMIL_LABOUR" | "HINDI_CREW";
  company: "STANDARD_ROOFS" | "INVI_CREATION";
  totalWorkingDays: number;
  daysPresent: number;
  baseRate: number;
  grossSalary: number;
  otAndIncentive: number;
  nightDutyAmount: number;
  lastMonthBalance: number;
  advanceDeduction: number;
  expenseBalanceDeduction: number;
  netSalary: number;
  paidCash: number;
  paidBankOrGpay: number;
  paymentChannel: "CASH" | "ICICI" | "OFFICE_GPAY" | "AGENT_ACCOUNT";
  carryForwardBalance: number;
  isCleared: boolean;
  notes: string | null;
}

export interface ParsedPayrollRun {
  cycleType: "MONTHLY_OFFICE" | "BI_MONTHLY_TAMIL" | "BI_MONTHLY_HINDI";
  month: string; // YYYY-MM
  halfPeriod: "FULL" | "FIRST_HALF" | "SECOND_HALF";
  companyFilter: "ALL" | "STANDARD_ROOFS" | "INVI_CREATION";
  status: "DRAFT" | "APPROVED" | "PAID";
  items: ParsedPayrollItem[];
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

function num(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
  const cleaned = String(val).replace(/[₹,\s]/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function str(val: any): string {
  return String(val ?? "").trim();
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[.\s]+/g, " ").trim();
}

function nextHalfSlot(month: string, half: "FIRST_HALF" | "SECOND_HALF"): { month: string; half: "FIRST_HALF" | "SECOND_HALF" } {
  if (half === "FIRST_HALF") {
    return { month, half: "SECOND_HALF" };
  }
  const [yStr, mStr] = month.split("-");
  let y = Number(yStr);
  let m = Number(mStr) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return { month: `${y}-${String(m).padStart(2, "0")}`, half: "FIRST_HALF" };
}

export async function parseAndImportPayrollWorkbook(
  buffer: Buffer,
  prisma: PrismaClient
): Promise<{ runsImported: number; itemsImported: number; summary: string[] }> {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Load existing employees for matching
  const employees = await prisma.employeeOrLabour.findMany({
    select: {
      id: true,
      name: true,
      employeeCode: true,
      category: true,
      companyUnit: true,
    },
  });

  const matchEmployee = (rawName: string, defaultCategory: "OFFICE" | "TAMIL_LABOUR" | "HINDI_CREW") => {
    const clean = normalizeName(rawName);
    const firstWord = clean.split(" ")[0];
    // Exact or normalized match first
    let found = employees.find((e) => normalizeName(e.name) === clean);
    if (!found && firstWord.length >= 3) {
      found = employees.find((e) => {
        const en = normalizeName(e.name);
        return en.startsWith(firstWord + " ") || en === firstWord || clean.startsWith(en + " ");
      });
    }
    if (found) {
      return {
        employeeId: found.id,
        employeeCode: found.employeeCode,
        company: (found.companyUnit === "INVI_CREATION" ? "INVI_CREATION" : "STANDARD_ROOFS") as "STANDARD_ROOFS" | "INVI_CREATION",
      };
    }
    const slug = rawName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const prefix = defaultCategory === "OFFICE" ? "HOF" : defaultCategory === "TAMIL_LABOUR" ? "HTL" : "HHL";
    return {
      employeeId: `HIST_${defaultCategory}_${slug}`,
      employeeCode: `${prefix}-${slug.slice(0, 6)}`,
      company: "STANDARD_ROOFS" as const,
    };
  };

  const runs: ParsedPayrollRun[] = [];

  // 1. PARSE "Salary" SHEET (Office Staff)
  const salarySheetName = wb.SheetNames.find((n: string) => n.trim().toLowerCase() === "salary");
  if (salarySheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[salarySheetName], { header: 1, defval: "" }) as any[][];
    let currentRun: ParsedPayrollRun | null = null;
    let inHeader = false;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const c0 = str(r[0]);

      const titleMatch = c0.match(/Salary details for the Month of\s+([A-Za-z]+)[-\s]+(\d{4})/i);
      if (titleMatch) {
        const mCode = MONTH_MAP[titleMatch[1].toLowerCase()];
        const year = titleMatch[2];
        if (mCode) {
          currentRun = {
            cycleType: "MONTHLY_OFFICE",
            month: `${year}-${mCode}`,
            halfPeriod: "FULL",
            companyFilter: "ALL",
            status: "PAID",
            items: [],
          };
          runs.push(currentRun);
          inHeader = false;
        }
        continue;
      }

      if (!currentRun) continue;

      if (c0.toLowerCase() === "name") {
        inHeader = true;
        continue;
      }

      if (!c0 || c0.toLowerCase().startsWith("total salary")) {
        inHeader = false;
        continue;
      }

      if (inHeader || (num(r[3]) > 0 && num(r[4]) > 0)) {
        const totalWorkingDays = num(r[1]) || 26;
        const daysPresent = num(r[2]);
        const baseRate = num(r[3]);
        const grossSalary = num(r[4]);
        const expenseBalanceDeduction = num(r[5]);
        const advanceDeduction = num(r[6]);
        const otAndIncentive = num(r[7]);
        const netSalary = num(r[8]);
        let paidCash = num(r[9]);
        let paidBankOrGpay = num(r[10]);
        let carryForwardBalance = num(r[11]);
        let notes = str(r[12]) || null;

        // Handle Oct-2026 layout where col 13 has bank/gpay paid and col 14 has balance
        if (paidCash === 0 && paidBankOrGpay === 0 && num(r[13]) > 0) {
          paidBankOrGpay = num(r[13]);
          carryForwardBalance = num(r[14]);
        }

        const emp = matchEmployee(c0, "OFFICE");
        const paymentChannel = paidBankOrGpay > 0 ? "ICICI" : "CASH";
        const isCleared = paidCash + paidBankOrGpay > 0 && Math.abs(carryForwardBalance) < 1;

        currentRun.items.push({
          employeeName: c0,
          employeeCode: emp.employeeCode,
          employeeId: emp.employeeId,
          category: "OFFICE",
          company: emp.company,
          totalWorkingDays,
          daysPresent,
          baseRate,
          grossSalary,
          otAndIncentive,
          nightDutyAmount: 0,
          lastMonthBalance: 0,
          advanceDeduction,
          expenseBalanceDeduction,
          netSalary,
          paidCash,
          paidBankOrGpay,
          paymentChannel,
          carryForwardBalance,
          isCleared,
          notes,
        });
      }
    }
  }

  // 2. PARSE "Hindi Labour " SHEET (Bi-Monthly Hindi Crew)
  const hindiSheetName = wb.SheetNames.find((n: string) => n.trim().toLowerCase().startsWith("hindi"));
  if (hindiSheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[hindiSheetName], { header: 1, defval: "" }) as any[][];
    let currentRun: ParsedPayrollRun | null = null;
    let inHeader = false;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const c0 = str(r[0]);

      if (c0.toLowerCase().startsWith("hindi labour report")) {
        const dateMatch = c0.match(/(\d{1,2})[-\s]+([A-Za-z]+).*?(\d{4})?/i);
        let month = "2026-06";
        let halfPeriod: "FIRST_HALF" | "SECOND_HALF" = "FIRST_HALF";
        if (dateMatch) {
          const day = Number(dateMatch[1]);
          const mCode = MONTH_MAP[dateMatch[2].toLowerCase()] || "06";
          const yearMatch = c0.match(/(202\d)/);
          const year = yearMatch ? yearMatch[1] : "2026";
          month = `${year}-${mCode}`;
          halfPeriod = day <= 12 ? "FIRST_HALF" : "SECOND_HALF";
        }
        currentRun = {
          cycleType: "BI_MONTHLY_HINDI",
          month,
          halfPeriod,
          companyFilter: "ALL",
          status: "PAID",
          items: [],
        };
        runs.push(currentRun);
        inHeader = false;
        continue;
      }

      if (!currentRun) continue;

      if (c0.toLowerCase().startsWith("name")) {
        inHeader = true;
        continue;
      }

      if (c0.toLowerCase().startsWith("total amount")) {
        const totalNotes = str(r[7]);
        const isGpay = totalNotes.toLowerCase().includes("gpay");
        const isAgent = totalNotes.toLowerCase().includes("agent");
        const channel = isGpay ? "OFFICE_GPAY" : isAgent ? "AGENT_ACCOUNT" : "CASH";
        for (const item of currentRun.items) {
          item.paymentChannel = channel;
          if (isGpay || isAgent) {
            item.paidBankOrGpay = item.netSalary;
            item.paidCash = 0;
          } else {
            item.paidCash = item.netSalary;
            item.paidBankOrGpay = 0;
          }
          item.isCleared = true;
          if (totalNotes && !item.notes) {
            item.notes = totalNotes;
          }
        }
        inHeader = false;
        continue;
      }

      if (!c0 || !inHeader) continue;

      const baseRate = num(r[1]);
      const daysPresent = num(r[2]);
      const grossSalary = num(r[3]);
      const advanceDeduction = num(r[4]);
      const otAndIncentive = num(r[5]);
      const netSalary = num(r[6]);
      const notes = str(r[7]) || null;

      const emp = matchEmployee(c0, "HINDI_CREW");
      currentRun.items.push({
        employeeName: c0,
        employeeCode: emp.employeeCode,
        employeeId: emp.employeeId,
        category: "HINDI_CREW",
        company: emp.company,
        totalWorkingDays: 15,
        daysPresent,
        baseRate,
        grossSalary,
        otAndIncentive,
        nightDutyAmount: 0,
        lastMonthBalance: 0,
        advanceDeduction,
        expenseBalanceDeduction: 0,
        netSalary,
        paidCash: netSalary,
        paidBankOrGpay: 0,
        paymentChannel: "CASH",
        carryForwardBalance: 0,
        isCleared: true,
        notes,
      });
    }
  }

  // 3. PARSE "Wages" SHEET (Bi-Monthly Tamil Labours)
  const wagesSheetName = wb.SheetNames.find((n: string) => n.trim().toLowerCase() === "wages");
  if (wagesSheetName) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wagesSheetName], { header: 1, defval: "" }) as any[][];
    const seenTamilSlots = new Map<string, string>(); // slotKey -> signature of first 2 items

    let i = 0;
    while (i < rows.length) {
      const c0 = str(rows[i][0]);
      if (c0.toLowerCase().startsWith("wages details")) {
        // Parse date range in parens: (DD-MM-YYYY to DD-MM-YYYY)
        const rangeMatch = c0.match(/\((\d{2})-(\d{2})-(\d{4})\s*to/i);
        let month = "2025-11";
        let halfPeriod: "FIRST_HALF" | "SECOND_HALF" = "SECOND_HALF";
        if (rangeMatch) {
          const day = Number(rangeMatch[1]);
          const m = rangeMatch[2];
          const y = rangeMatch[3];
          month = `${y}-${m}`;
          halfPeriod = day <= 12 ? "FIRST_HALF" : "SECOND_HALF";
        }

        // Collect block items until next "Total" or next "Wages details"
        const blockItems: ParsedPayrollItem[] = [];
        let j = i + 1;
        let headerSeen = false;
        while (j < rows.length) {
          const r = rows[j];
          const nameCol = str(r[0]);
          if (nameCol.toLowerCase().startsWith("wages details")) break;
          if (nameCol.toLowerCase().startsWith("name")) {
            headerSeen = true;
            j++;
            continue;
          }
          if (nameCol.toLowerCase().startsWith("total")) {
            j++;
            break;
          }
          if (headerSeen && nameCol) {
            const baseRate = num(r[1]);
            const daysPresent = num(r[2]);
            const grossSalary = num(r[3]);
            const advanceDeduction = num(r[4]);
            const lastMonthBalance = num(r[5]);
            const nightDutyAmount = num(r[6]);
            const netSalary = num(r[7]);
            const givenAmount = num(r[8]);
            const balanceAmount = num(r[9]);
            const clearedText = str(r[10]).toLowerCase();
            const noteParts = [str(r[11]), str(r[12]), str(r[13])].filter(Boolean);
            const notes = noteParts.length > 0 ? noteParts.join(" | ") : null;

            const isGpay = (notes || "").toLowerCase().includes("gpay");
            const emp = matchEmployee(nameCol, "TAMIL_LABOUR");

            blockItems.push({
              employeeName: nameCol,
              employeeCode: emp.employeeCode,
              employeeId: emp.employeeId,
              category: "TAMIL_LABOUR",
              company: emp.company,
              totalWorkingDays: 15,
              daysPresent,
              baseRate,
              grossSalary,
              otAndIncentive: 0,
              nightDutyAmount,
              lastMonthBalance,
              advanceDeduction,
              expenseBalanceDeduction: 0,
              netSalary,
              paidCash: isGpay ? 0 : givenAmount,
              paidBankOrGpay: isGpay ? givenAmount : 0,
              paymentChannel: isGpay ? "OFFICE_GPAY" : "CASH",
              carryForwardBalance: balanceAmount,
              isCleared: clearedText.includes("clear") || (givenAmount > 0 && balanceAmount === 0),
              notes,
            });
          }
          j++;
        }

        const sig = blockItems.slice(0, 2).map((x) => `${x.employeeName}:${x.daysPresent}:${x.netSalary}`).join("|");
        let slotKey = `${month}_${halfPeriod}`;

        // Check if exact duplicate block (e.g. copy-pasted Feb 1-15 block in Excel)
        if (seenTamilSlots.get(slotKey) === sig) {
          i = j;
          continue;
        }

        // If slot already used by a different dataset (accountant forgot to update date range), advance to next half-month slot
        while (seenTamilSlots.has(slotKey)) {
          const next = nextHalfSlot(month, halfPeriod);
          month = next.month;
          halfPeriod = next.half;
          slotKey = `${month}_${halfPeriod}`;
        }

        seenTamilSlots.set(slotKey, sig);
        if (blockItems.length > 0) {
          runs.push({
            cycleType: "BI_MONTHLY_TAMIL",
            month,
            halfPeriod,
            companyFilter: "ALL",
            status: "PAID",
            items: blockItems,
          });
        }
        i = j;
        continue;
      }
      i++;
    }
  }

  // Upsert all runs & items idempotently inside transactions
  let runsImported = 0;
  let itemsImported = 0;
  const summary: string[] = [];

  for (const runData of runs) {
    if (runData.items.length === 0) continue;

    const totalGross = Math.round(runData.items.reduce((s, it) => s + it.grossSalary, 0) * 100) / 100;
    const totalDeductions = Math.round(runData.items.reduce((s, it) => s + it.advanceDeduction + it.expenseBalanceDeduction, 0) * 100) / 100;
    const totalNet = Math.round(runData.items.reduce((s, it) => s + it.netSalary, 0) * 100) / 100;
    const paidCash = Math.round(runData.items.reduce((s, it) => s + it.paidCash, 0) * 100) / 100;
    const paidBank = Math.round(runData.items.reduce((s, it) => s + it.paidBankOrGpay, 0) * 100) / 100;

    const run = await prisma.payrollRun.upsert({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType: runData.cycleType,
          month: runData.month,
          halfPeriod: runData.halfPeriod,
          companyFilter: runData.companyFilter,
        },
      },
      update: {
        status: runData.status,
        totalGross,
        totalDeductions,
        totalNet,
        paidCash,
        paidBank,
      },
      create: {
        cycleType: runData.cycleType,
        month: runData.month,
        halfPeriod: runData.halfPeriod,
        companyFilter: runData.companyFilter,
        status: runData.status,
        totalGross,
        totalDeductions,
        totalNet,
        paidCash,
        paidBank,
      },
    });

    await prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });
    await prisma.payrollItem.createMany({
      data: runData.items.map((it) => ({
        ...it,
        payrollRunId: run.id,
      })),
    });

    runsImported++;
    itemsImported += runData.items.length;
    summary.push(`${runData.cycleType} | ${runData.month} (${runData.halfPeriod}): ${runData.items.length} items, Net ₹${totalNet.toLocaleString("en-IN")}`);
  }

  return { runsImported, itemsImported, summary };
}
