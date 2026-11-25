import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { recalculatePayrollRunTotals } from "../src/lib/payrollTotals";

function fmtJoining(d: Date | null | undefined): string | null {
  if (!d) return null;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = months[d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return `${day}-${mon}-${yr}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("[FixPayrollData] Starting cleanup & KYC backfill...");

    // 1. Seed Periyasamy R's real KYC details
    const periyasamy = await prisma.employeeOrLabour.findFirst({
      where: { name: { contains: "Periyasamy", mode: "insensitive" } },
    });
    if (periyasamy) {
      await prisma.employeeOrLabour.update({
        where: { id: periyasamy.id },
        data: {
          designation: "TEAM LEAD",
          dateOfJoining: new Date(Date.UTC(2025, 8, 17)), // 2025-09-17
          location: "ERODE",
          state: "TAMIL NADU",
          phone: "9095153470",
          aadhaarNumber: "718496003171",
          bankName: "SBI",
          bankAccountNo: "41127804561",
          monthlySalary: "19000.00",
        },
      });
      console.log(`  -> Updated KYC for Periyasamy R (${periyasamy.employeeCode})`);
    }

    // Load all employees for matching
    const employees = await prisma.employeeOrLabour.findMany();
    const empById = new Map(employees.map((e) => [e.id, e]));
    const findEmp = (id: string, name: string) => {
      if (empById.has(id)) return empById.get(id)!;
      const lower = name.toLowerCase().trim();
      const first = lower.split(/[\s.]+/)[0];
      return (
        employees.find((e) => e.name.toLowerCase().trim() === lower) ||
        (first.length >= 3
          ? employees.find((e) => e.name.toLowerCase().startsWith(first))
          : undefined)
      );
    };

    // 2. Clean all PayrollItems
    const allItems = await prisma.payrollItem.findMany({
      include: { payrollRun: true },
    });

    let phonesExtracted = 0;
    let dailyRatesFixed = 0;
    let kycBackfilled = 0;

    for (const item of allItems) {
      const updates: any = {};
      const matchedEmp = findEmp(item.employeeId, item.employeeName);

      // Extract 10-digit mobile number from notes
      let cleanedNotes = item.notes || "";
      const phoneMatch = cleanedNotes.match(/\b([6-9]\d{9})\b/);
      let extractedPhone: string | null = null;
      if (phoneMatch) {
        extractedPhone = phoneMatch[1];
        cleanedNotes = cleanedNotes
          .replace(phoneMatch[0], "")
          .replace(/^[|\s,\-]+|[|\s,\-]+$/g, "")
          .trim();
        updates.notes = cleanedNotes || null;
        updates.mobileNo = extractedPhone;
        phonesExtracted++;

        if (matchedEmp && !matchedEmp.phone) {
          await prisma.employeeOrLabour.update({
            where: { id: matchedEmp.id },
            data: { phone: extractedPhone },
          });
          matchedEmp.phone = extractedPhone;
        }
      }

      // Compute leaveDays accurately
      const leaveDays = Math.max(0, Math.round((item.totalWorkingDays - item.daysPresent) * 100) / 100);
      if (item.leaveDays !== leaveDays) {
        updates.leaveDays = leaveDays;
      }

      // Fix daily-rate rows in MONTHLY_OFFICE (e.g. Gowri ₹1000/day, Lokesh ₹1200/day)
      if (item.category === "OFFICE" && item.baseRate > 0 && item.baseRate <= 2500) {
        const expectedGross = Math.round(item.baseRate * item.daysPresent);
        if (Math.abs(item.grossSalary - expectedGross) > 1) {
          updates.grossSalary = expectedGross;
          const net = Math.round(
            expectedGross +
              item.otAndIncentive +
              item.nightDutyAmount +
              item.vehicleAllowance +
              item.lastMonthBalance -
              item.advanceDeduction -
              item.expenseBalanceDeduction
          );
          updates.netSalary = net;
          updates.carryForwardBalance = Math.round((net - (item.paidCash + item.paidBankOrGpay)) * 100) / 100;
          dailyRatesFixed++;
        }
      }

      // Backfill KYC snapshots from matched EmployeeOrLabour
      if (matchedEmp) {
        if (!item.designation && matchedEmp.designation) updates.designation = matchedEmp.designation;
        if (!item.joiningDate && matchedEmp.dateOfJoining) updates.joiningDate = fmtJoining(matchedEmp.dateOfJoining);
        if (!item.location) updates.location = matchedEmp.location || "ERODE";
        if (!item.state) updates.state = matchedEmp.state || "TAMIL NADU";
        if (!item.mobileNo && !updates.mobileNo && matchedEmp.phone) updates.mobileNo = matchedEmp.phone;
        if (!item.aadhaarNo && matchedEmp.aadhaarNumber) updates.aadhaarNo = matchedEmp.aadhaarNumber;
        if (!item.bankName && matchedEmp.bankName) updates.bankName = matchedEmp.bankName;
        if (!item.accountNo && (matchedEmp.bankAccountNo || matchedEmp.bankAccountNumber)) {
          updates.accountNo = matchedEmp.bankAccountNo || matchedEmp.bankAccountNumber;
        }
        kycBackfilled++;
      } else {
        if (!item.location) updates.location = "ERODE";
        if (!item.state) updates.state = "TAMIL NADU";
      }

      if (Object.keys(updates).length > 0) {
        await prisma.payrollItem.update({
          where: { id: item.id },
          data: updates,
        });
      }
    }

    // 3. Recalculate all PayrollRun totals
    const runs = await prisma.payrollRun.findMany({ select: { id: true } });
    for (const r of runs) {
      await recalculatePayrollRunTotals(r.id, prisma);
    }

    console.log(`[FixPayrollData] Completed!`);
    console.log(`  -> Total Items Processed: ${allItems.length}`);
    console.log(`  -> Phones Extracted     : ${phonesExtracted}`);
    console.log(`  -> Daily Rates Fixed    : ${dailyRatesFixed}`);
    console.log(`  -> KYC Backfilled       : ${kycBackfilled}`);
    console.log(`  -> PayrollRuns Synced   : ${runs.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[FixPayrollData] Error:", err);
  process.exit(1);
});
