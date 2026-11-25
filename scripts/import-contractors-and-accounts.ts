import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient, CashFlowType } from "@prisma/client";
import { computeAmountToGive, recalculateSubContractorLedger } from "../src/lib/subContractorLedger";

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

function parseExcelDate(val: any, fallback: Date): Date {
  if (!val) return fallback;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number" && val > 25000 && val < 60000) {
    // Excel serial date
    const utcDays = Math.floor(val - 25569);
    return new Date(utcDays * 86400 * 1000);
  }
  const s = str(val);
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    if (!isNaN(d.getTime())) return d;
  }
  // DD.MM.YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]);
    let yr = Number(dmy[3]);
    if (yr < 100) yr += 2000;
    if (yr >= 2020 && yr <= 2030 && mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(yr, mon - 1, day));
    }
  }
  return fallback;
}

function normalizeWallet(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("office cash")) return "Office Cash";
  if (lower.includes("icici")) return "ICICI";
  if (lower.includes("office gpay")) return "Office Gpay";
  if (lower.includes("ravi")) return "Ravi Gpay";
  if (lower.includes("prabha")) return "Prabha Gpay";
  if (lower.includes("rbl")) return "RBL";
  if (lower.includes("periyasamy")) return "Periyasamy Gpay";
  if (lower.includes("suji")) return "Suji Cash";
  return raw || "Office Cash";
}

async function importContractors(prisma: PrismaClient) {
  const filePath = path.resolve(process.cwd(), "imports", "Contractor Payments .xlsx");
  const wb = XLSX.readFile(filePath);

  let teamsCount = 0;
  let entriesCount = 0;

  // Skip legacy duplicate/unstructured archive sheets if exact primary sheet exists
  const SKIP_SHEETS = new Set(["Velu team old", "Sakthi team"]);

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName.trim())) continue;

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" }) as any[][];
    if (rows.length < 2) continue;

    const cleanTeamName = sheetName
      .replace(/payment/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const team = await prisma.subContractor.upsert({
      where: { name: cleanTeamName },
      update: {},
      create: {
        name: cleanTeamName,
        tradeCategory: cleanTeamName.toLowerCase().includes("paint") ? "Painting & Primer" : "Roofing & Fabrication",
        openingBalance: 0,
        currentBalance: 0,
      },
    });

    await prisma.subContractorLedgerEntry.deleteMany({ where: { subContractorId: team.id } });

    const isPainterSheet = cleanTeamName.toLowerCase().includes("painter");
    let lastDate = new Date(Date.UTC(2025, 8, 1));
    let openingSet = false;
    const toInsert: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const c0 = str(r[0]);
      const particulars = str(r[1]);

      // Skip blank/filler rows
      const hasNumeric = isPainterSheet
        ? num(r[2]) !== 0 || num(r[3]) !== 0 || num(r[4]) !== 0 || num(r[5]) !== 0 || num(r[6]) !== 0
        : num(r[2]) !== 0 || num(r[3]) !== 0 || num(r[4]) !== 0 || num(r[5]) !== 0 || num(r[6]) !== 0 || num(r[7]) !== 0;

      if (!particulars && !hasNumeric) continue;
      if (particulars.toLowerCase().includes("accounts closed")) continue;

      const rowDate = parseExcelDate(r[0], lastDate);
      lastDate = rowDate;

      if (isPainterSheet) {
        // Painter columns: Date | Particulars | Sqft | Rate | Labour & Mat | Amount | Payment | Balance
        const sqft = num(r[2]);
        const rate = num(r[3]);
        const other = sqft === 0 && rate === 0 ? num(r[4]) : 0;
        const given = num(r[6]);
        const entryType =
          given > 0 && sqft === 0 && other === 0
            ? "PAYMENT"
            : sqft > 0
            ? "WORK_BILL"
            : "EXTRA_LABOUR";

        const amountToGive = computeAmountToGive(entryType, sqft, rate, other, 0);
        toInsert.push({
          subContractorId: team.id,
          entryDate: rowDate,
          siteName: null,
          particulars: particulars || "Work / Payment",
          entryType,
          sqft,
          ratePerSqft: rate,
          otherAllowance: other,
          materialReduction: 0,
          amountToGive,
          givenAmount: given,
          runningBalance: 0,
          notes: str(r[8]) || null,
        });
      } else {
        // Standard columns: Date | Particulars | SqFt | Rate | Other | Reduction | AmountToGive | Given | Balance | SiteName
        const sqft = num(r[2]);
        const rate = num(r[3]);
        const other = num(r[4]);
        const reduction = num(r[5]);
        const given = num(r[7]);
        const excelBal = num(r[8]);
        const siteName = c0 && !c0.match(/^\d/) ? c0 : str(r[9]) || null;

        if (!openingSet && toInsert.length === 0 && (particulars.toLowerCase().includes("old balance") || particulars.toLowerCase().includes("opening balance"))) {
          await prisma.subContractor.update({
            where: { id: team.id },
            data: { openingBalance: excelBal },
          });
          openingSet = true;
          continue;
        }

        let entryType: "WORK_BILL" | "EXTRA_LABOUR" | "MATERIAL_DEDUCTION" | "PAYMENT" | "ADJUSTMENT" = "WORK_BILL";
        if (reduction > 0 && sqft === 0 && other === 0) {
          entryType = "MATERIAL_DEDUCTION";
        } else if (given > 0 && sqft === 0 && other === 0 && reduction === 0) {
          entryType = "PAYMENT";
        } else if (other > 0 && sqft === 0) {
          entryType = "EXTRA_LABOUR";
        }

        const amountToGive = computeAmountToGive(entryType, sqft, rate, other, reduction);
        if (amountToGive === 0 && given === 0 && !particulars) continue;

        toInsert.push({
          subContractorId: team.id,
          entryDate: rowDate,
          siteName,
          particulars: particulars || "Work / Payment",
          entryType,
          sqft,
          ratePerSqft: rate,
          otherAllowance: other,
          materialReduction: reduction,
          amountToGive,
          givenAmount: given,
          runningBalance: 0,
        });
      }
    }

    if (toInsert.length > 0) {
      await prisma.subContractorLedgerEntry.createMany({ data: toInsert });
      await recalculateSubContractorLedger(team.id, prisma);
    }

    teamsCount++;
    entriesCount += toInsert.length;
  }

  return { teamsCount, entriesCount };
}

async function importAccountsWorkbook(prisma: PrismaClient) {
  const filePath = path.resolve(process.cwd(), "imports", "Accounts_Nov_2026  (1).xlsx");
  const wb = XLSX.readFile(filePath);

  const fy =
    (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
    (await prisma.financialYear.findFirst());
  const user = await prisma.user.findFirst();
  if (!fy || !user) throw new Error("FinancialYear or User not seeded");

  // 1. Import "Accounts" sheet into CashBookEntry
  let cashEntriesCount = 0;
  const accountsSheet = wb.Sheets["Accounts"];
  if (accountsSheet) {
    const rows = XLSX.utils.sheet_to_json(accountsSheet, { header: 1, defval: "" }) as any[][];
    let lastDate = new Date(Date.UTC(2026, 10, 1));

    // Delete previously imported NOV26-ACC-* entries so re-run is idempotent
    await prisma.cashBookEntry.deleteMany({
      where: { voucherNumber: { startsWith: "NOV26-ACC-" } },
    });

    const cashRows: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const particulars = str(r[1]);
      const desc = str(r[2]);
      const inflow = num(r[3]);
      const outflow = num(r[4]);
      const accountRaw = str(r[6]);

      if (!desc && inflow === 0 && outflow === 0) continue;
      if (!accountRaw) continue;

      const d = parseExcelDate(r[0], lastDate);
      lastDate = d;
      const walletName = normalizeWallet(accountRaw);

      // Handle negative opening balance (e.g. Prabha Gpay -11525.15) as CASH_OUTFLOW
      let type: CashFlowType = CashFlowType.CASH_INFLOW;
      let amount = 0;
      if (inflow < 0) {
        type = CashFlowType.CASH_OUTFLOW;
        amount = Math.abs(inflow);
      } else if (inflow > 0) {
        type = CashFlowType.CASH_INFLOW;
        amount = inflow;
      } else if (outflow > 0) {
        type = CashFlowType.CASH_OUTFLOW;
        amount = outflow;
      } else {
        continue;
      }

      cashRows.push({
        voucherNumber: `NOV26-ACC-${String(i).padStart(4, "0")}`,
        date: d,
        type,
        amount: amount.toFixed(2),
        purpose: desc || particulars || "Opening / Ledger Entry",
        category: particulars || (desc.toLowerCase().includes("opening") ? "Opening Balance" : "General"),
        walletName,
        financialYearId: fy.id,
        createdById: user.id,
      });
    }

    if (cashRows.length > 0) {
      await prisma.cashBookEntry.createMany({ data: cashRows });
      cashEntriesCount = cashRows.length;
    }
  }

  // 2. Import "Supplier payment" -> Supplier balances
  let suppliersCount = 0;
  const supSheet = wb.Sheets["Supplier payment"];
  if (supSheet) {
    const rows = XLSX.utils.sheet_to_json(supSheet, { header: 1, defval: "" }) as any[][];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const supName = str(r[15]); // Balance Payment table col 15: Supplier Name, col 16: Pending Amount
      const pending = num(r[16]);
      if (!supName || supName.toLowerCase() === "total") continue;

      const existing = await prisma.supplier.findFirst({
        where: { name: { equals: supName, mode: "insensitive" } },
      });
      if (existing) {
        await prisma.supplier.update({
          where: { id: existing.id },
          data: { outstandingBalance: pending.toFixed(2) },
        });
      } else {
        await prisma.supplier.create({
          data: {
            name: supName,
            outstandingBalance: pending.toFixed(2),
          },
        });
      }
      suppliersCount++;
    }
  }

  // 3. Import "Customer_Payment" -> Customer receivables
  let customersCount = 0;
  const custSheet = wb.Sheets["Customer_Payment"];
  if (custSheet) {
    const rows = XLSX.utils.sheet_to_json(custSheet, { header: 1, defval: "" }) as any[][];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      const sno = str(r[0]);
      const custName = str(r[1]);
      const bal = num(r[4]);
      if (!custName || !/^\d+$/.test(sno)) continue;

      const existing = await prisma.customer.findFirst({
        where: { name: { equals: custName, mode: "insensitive" } },
      });
      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { outstandingBalance: bal.toFixed(2) },
        });
      } else {
        await prisma.customer.create({
          data: {
            name: custName,
            billingAddress: "Tamil Nadu",
            outstandingBalance: bal.toFixed(2),
          },
        });
      }
      customersCount++;
    }
  }

  // 4. Import "Advance & Loans" -> Employee advances & SR BusinessLoans
  let loansCount = 0;
  const loanSheet = wb.Sheets["Advance & Loans"];
  if (loanSheet) {
    const rows = XLSX.utils.sheet_to_json(loanSheet, { header: 1, defval: "" }) as any[][];
    let mode: "ADV" | "LOAN" | null = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const c0 = str(r[0]);
      const amt = num(r[1]);
      const notes = str(r[2]);
      if (c0.toLowerCase().includes("loan and advance given")) {
        mode = "ADV";
        continue;
      }
      if (c0.toLowerCase().includes("sr loan")) {
        mode = "LOAN";
        continue;
      }
      if (c0.toLowerCase().includes("advance given to cotractors")) {
        mode = null;
        continue;
      }
      if (!c0 || c0.toLowerCase().startsWith("total")) continue;

      if (mode === "ADV" && amt > 0) {
        const emp = await prisma.employeeOrLabour.findFirst({
          where: { name: { contains: c0, mode: "insensitive" } },
        });
        if (emp) {
          await prisma.employeeOrLabour.update({
            where: { id: emp.id },
            data: { cashAdvanceBalance: amt.toFixed(2) },
          });
        }
      } else if (mode === "LOAN" && amt > 0) {
        const code = `SR-LN-${c0.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 12)}`;
        await prisma.businessLoan.upsert({
          where: { loanCode: code },
          update: {
            principalAmount: amt.toFixed(2),
            outstandingBalance: amt.toFixed(2),
            notes: notes || null,
          },
          create: {
            loanCode: code,
            lenderName: c0,
            loanType: "WORKING_CAPITAL_CC_OD",
            principalAmount: amt.toFixed(2),
            outstandingBalance: amt.toFixed(2),
            interestRate: "0.00",
            tenureMonths: 12,
            monthlyEmiAmount: "0.00",
            disbursementDate: new Date(Date.UTC(2026, 10, 1)),
            notes: notes || null,
          },
        });
        loansCount++;
      }
    }
  }

  return { cashEntriesCount, suppliersCount, customersCount, loansCount };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("[Import] Importing Contractor Payments .xlsx...");
    const cRes = await importContractors(prisma);
    console.log(`  -> Contractor Teams: ${cRes.teamsCount}, Ledger Entries: ${cRes.entriesCount}`);

    console.log("[Import] Importing Accounts_Nov_2026 (1).xlsx...");
    const aRes = await importAccountsWorkbook(prisma);
    console.log(`  -> 8-Wallet CashBook Entries: ${aRes.cashEntriesCount}`);
    console.log(`  -> Suppliers Updated/Created: ${aRes.suppliersCount}`);
    console.log(`  -> Customers Updated/Created: ${aRes.customersCount}`);
    console.log(`  -> Business Loans Upserted  : ${aRes.loansCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[Import] Error:", err);
  process.exit(1);
});
