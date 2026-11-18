import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { postDoubleEntryTransaction } from "@/lib/accounting";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const payrolls = await prisma.staffPayroll.findMany({
      include: {
        employee: true,
        journalEntry: { select: { id: true, entryNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const staffMembers = await prisma.employeeOrLabour.findMany({
      where: {
        OR: [
          { roleType: "PERMANENT_STAFF" },
          { payCycle: "MONTHLY" },
        ],
      },
      include: {
        advances: {
          where: { status: "OUTSTANDING" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, payrolls, staffMembers });
  } catch (error: any) {
    console.error("GET /api/labour/staff error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employeeId,
      monthYear,
      basicSalary,
      allowances,
      advancesDeducted,
      tdsDeduction,
      paymentMode,
      bankAccountId,
      notes,
      payoutDate,
    } = body;

    const employee = await prisma.employeeOrLabour.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new Error("Staff member not found");

    const basic = toDecimal(basicSalary || 0);
    const allow = toDecimal(allowances || 0);
    const gross = basic.plus(allow);
    const adv = toDecimal(advancesDeducted || 0);
    const tds = toDecimal(tdsDeduction || 0);
    const net = gross.minus(adv).minus(tds);

    if (net.lessThan(0)) {
      throw new Error("Deductions cannot exceed gross salary");
    }

    // Active FY
    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.financialYear.findFirst();
    if (!fy) throw new Error("No active financial year found");

    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No admin user found");

    const count = await prisma.staffPayroll.count();
    const payrollNumber = `PAY/26-27/${String(count + 1).padStart(4, "0")}`;

    // Salary expense account
    let salaryAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: "5040" },
          { name: { contains: "Salary", mode: "insensitive" } },
          { name: { contains: "Labour", mode: "insensitive" } },
        ],
      },
    });
    if (!salaryAccount) {
      salaryAccount = await prisma.account.findFirst({ where: { type: "EXPENSE" } });
    }
    if (!salaryAccount) throw new Error("Salary expense account not found");

    // Payment source account (Bank or Cash)
    let creditAccountId: string;
    if (paymentMode === "BANK" && bankAccountId) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) throw new Error("Bank account not found");
      creditAccountId = bank.accountId;
    } else {
      const cashAcc = await prisma.account.findFirst({
        where: { OR: [{ code: "1010" }, { name: { contains: "Cash", mode: "insensitive" } }] },
      });
      if (!cashAcc) throw new Error("Cash in Hand account not found");
      creditAccountId = cashAcc.id;
    }

    // Build double-entry lines
    const lines = [
      {
        accountId: salaryAccount.id,
        debit: gross,
        credit: toDecimal(0),
        narration: `Staff Salary for ${employee.name} (${monthYear})`,
      },
      {
        accountId: creditAccountId,
        debit: toDecimal(0),
        credit: net,
        narration: `Net Salary Payout via ${paymentMode || "BANK"} - ${payrollNumber}`,
      },
    ];

    // If advance deducted, credit advance asset
    if (adv.greaterThan(0)) {
      const advAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "1050" },
            { name: { contains: "Advance", mode: "insensitive" } },
          ],
        },
      });
      if (advAccount) {
        lines.push({
          accountId: advAccount.id,
          debit: toDecimal(0),
          credit: adv,
          narration: `Advance recovery for ${employee.name}`,
        });
      }
    }

    const narration = `Monthly Staff Salary Payout for ${employee.name} (${monthYear}) [${payrollNumber}] Gross: ₹${gross}, Net: ₹${net}`;

    const jEntry = await postDoubleEntryTransaction({
      date: payoutDate ? new Date(payoutDate) : new Date(),
      voucherType: "STAFF_PAYROLL",
      narration,
      financialYearId: fy.id,
      lines,
      createdById: adminUser.id,
      referenceNumber: payrollNumber,
    });

    // Save Payroll record & deduct advance if any
    const payroll = await prisma.$transaction(async (tx) => {
      const rec = await tx.staffPayroll.create({
        data: {
          payrollNumber,
          employeeId,
          monthYear: monthYear || "Current Month",
          basicSalary: new Decimal(basic.toString()),
          allowances: new Decimal(allow.toString()),
          advancesDeducted: new Decimal(adv.toString()),
          tdsDeduction: new Decimal(tds.toString()),
          netPayable: new Decimal(net.toString()),
          paymentMode: paymentMode || "BANK",
          bankAccountId: bankAccountId || null,
          status: "PAID",
          payoutDate: payoutDate ? new Date(payoutDate) : new Date(),
          journalEntryId: jEntry.id,
          notes,
        },
      });

      if (adv.greaterThan(0)) {
        // Mark outstanding advance as deducted
        const firstAdv = await tx.labourAdvance.findFirst({
          where: { employeeId, status: "OUTSTANDING" },
          orderBy: { date: "asc" },
        });
        if (firstAdv) {
          await tx.labourAdvance.update({
            where: { id: firstAdv.id },
            data: { status: "DEDUCTED" },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "StaffPayroll",
          entityId: rec.id,
          newValues: JSON.stringify({ payrollNumber, employee: employee.name, net: net.toString() }),
          performedById: adminUser.id,
        },
      });

      return rec;
    });

    return NextResponse.json({ success: true, payroll });
  } catch (error: any) {
    console.error("POST /api/labour/staff error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
