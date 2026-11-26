import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal, Decimal } from "@/lib/decimal";
import { requireAuthorizedSession } from "@/lib/rbac";
import { AccountType, JournalStatus, VoucherType } from "@prisma/client";

function computeNextFinancialYear(currentName: string, currentStart: Date) {
  const match = currentName.match(/^(\d{4})-(\d{2})$/);
  const startYear = match ? Number(match[1]) + 1 : currentStart.getUTCFullYear() + 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  const nextFyName = `${startYear}-${endYearShort}`;
  const shortSuffix = `${String(startYear % 100).padStart(2, "0")}-${endYearShort}`;

  return {
    nextFyName,
    shortSuffix,
    startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)),
    endDate: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)),
  };
}

export async function GET() {
  try {
    const auth = await requireAuthorizedSession("settings", "VIEW");
    if (auth.error) return auth.error;

    const financialYears = await prisma.financialYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        voucherSequences: true,
      },
    });

    return NextResponse.json({ success: true, financialYears });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("settings", "APPROVE");
    if (auth.error) return auth.error;

    const body = await req.json();
    const { action, id, isLocked } = body;

    if (action === "TOGGLE_LOCK") {
      if (!id) {
        return NextResponse.json({ success: false, error: "Financial Year ID is required." }, { status: 400 });
      }

      const updated = await prisma.financialYear.update({
        where: { id },
        data: { isLocked: Boolean(isLocked) },
      });

      await prisma.auditLog.create({
        data: {
          action: updated.isLocked ? "LOCK_FY" : "UNLOCK_FY",
          entityType: "FinancialYear",
          entityId: updated.id,
          newValues: JSON.stringify({ name: updated.name, isLocked: updated.isLocked }),
          performedById: auth.session.userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Financial Year ${updated.name} is now ${updated.isLocked ? "LOCKED" : "UNLOCKED"}.`,
        financialYear: updated,
      });
    }

    if (action === "CLOSE_YEAR") {
      if (!id) {
        return NextResponse.json({ success: false, error: "Active Financial Year ID is required." }, { status: 400 });
      }

      const closedAt = new Date();
      const closedBy = auth.session.name || auth.session.email;

      const result = await prisma.$transaction(async (tx) => {
        const currentFy = await tx.financialYear.findUniqueOrThrow({
          where: { id },
        });

        if (currentFy.isClosed) {
          throw new Error(`Financial Year ${currentFy.name} is already closed.`);
        }

        const incomeAccounts = await tx.account.findMany({ where: { type: AccountType.INCOME } });
        const expenseAccounts = await tx.account.findMany({ where: { type: AccountType.EXPENSE } });

        let totalIncome = new Decimal(0);
        for (const a of incomeAccounts) {
          totalIncome = totalIncome.plus(toDecimal(a.currentBalance));
        }

        let totalExpense = new Decimal(0);
        for (const a of expenseAccounts) {
          totalExpense = totalExpense.plus(toDecimal(a.currentBalance));
        }

        const netSurplus = totalIncome.minus(totalExpense);
        const retainedEarnings = await tx.account.findUnique({
          where: { code: "3020" },
        });

        // Generate closing journal entry for P&L -> Retained Earnings if non-zero
        let closingEntryNumber: string | null = null;
        if (retainedEarnings && !netSurplus.isZero()) {
          const closingLines: any[] = [];
          for (const inc of incomeAccounts) {
            const bal = toDecimal(inc.currentBalance);
            if (!bal.isZero()) {
              closingLines.push({
                accountId: inc.id,
                debit: bal.greaterThan(0) ? bal.toFixed(2) : "0.00",
                credit: bal.lessThan(0) ? bal.abs().toFixed(2) : "0.00",
                narration: `FY ${currentFy.name} P&L Closing: ${inc.name}`,
              });
            }
          }
          for (const exp of expenseAccounts) {
            const bal = toDecimal(exp.currentBalance);
            if (!bal.isZero()) {
              closingLines.push({
                accountId: exp.id,
                debit: bal.lessThan(0) ? bal.abs().toFixed(2) : "0.00",
                credit: bal.greaterThan(0) ? bal.toFixed(2) : "0.00",
                narration: `FY ${currentFy.name} P&L Closing: ${exp.name}`,
              });
            }
          }
          closingLines.push({
            accountId: retainedEarnings.id,
            debit: netSurplus.lessThan(0) ? netSurplus.abs().toFixed(2) : "0.00",
            credit: netSurplus.greaterThan(0) ? netSurplus.toFixed(2) : "0.00",
            narration: `Net Surplus/Deficit transferred from FY ${currentFy.name}`,
          });

          const totalDr = closingLines.reduce((s, l) => s.plus(toDecimal(l.debit)), new Decimal(0));
          const totalCr = closingLines.reduce((s, l) => s.plus(toDecimal(l.credit)), new Decimal(0));
          closingEntryNumber = `CLOSE/${currentFy.name}`;

          await tx.journalEntry.create({
            data: {
              entryNumber: closingEntryNumber,
              date: currentFy.endDate,
              voucherType: VoucherType.JOURNAL_VOUCHER,
              narration: `Year-End Closing Entry for FY ${currentFy.name} by ${closedBy}`,
              financialYearId: currentFy.id,
              totalDebit: totalDr.toFixed(2),
              totalCredit: totalCr.toFixed(2),
              status: JournalStatus.POSTED,
              createdById: auth.session.userId,
              lines: { create: closingLines },
            },
          });

          const curRetained = toDecimal(retainedEarnings.currentBalance);
          await tx.account.update({
            where: { id: retainedEarnings.id },
            data: { currentBalance: curRetained.plus(netSurplus).toFixed(2) },
          });
        }

        // Lock & close current year
        await tx.financialYear.update({
          where: { id: currentFy.id },
          data: {
            isClosed: true,
            isLocked: true,
            isCurrent: false,
          },
        });

        // Dynamically compute next Financial Year
        const nextSpec = computeNextFinancialYear(currentFy.name, currentFy.startDate);
        let nextFy = await tx.financialYear.findUnique({
          where: { name: nextSpec.nextFyName },
        });

        if (!nextFy) {
          nextFy = await tx.financialYear.create({
            data: {
              name: nextSpec.nextFyName,
              startDate: nextSpec.startDate,
              endDate: nextSpec.endDate,
              isCurrent: true,
              isLocked: false,
              isClosed: false,
            },
          });

          const seqTypes = [
            { type: "INVOICE", prefix: `SR/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "RECEIPT", prefix: `REC/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "PAYMENT", prefix: `PAY/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "JOURNAL_VOUCHER", prefix: `JV/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "EXPENSE", prefix: `EXP/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "CREDIT_NOTE", prefix: `CN/${nextSpec.shortSuffix}/`, next: 1 },
            { type: "DEBIT_NOTE", prefix: `DN/${nextSpec.shortSuffix}/`, next: 1 },
          ];

          for (const s of seqTypes) {
            await tx.voucherSequence.create({
              data: {
                financialYearId: nextFy.id,
                voucherType: s.type,
                prefix: s.prefix,
                nextNumber: s.next,
                paddingLength: 4,
              },
            });
          }
        } else {
          await tx.financialYear.update({
            where: { id: nextFy.id },
            data: { isCurrent: true },
          });
        }

        await tx.auditLog.create({
          data: {
            action: "CLOSE_YEAR",
            entityType: "FinancialYear",
            entityId: currentFy.id,
            newValues: JSON.stringify({
              closedYear: currentFy.name,
              activeYear: nextSpec.nextFyName,
              netSurplusTransferred: netSurplus.toFixed(2),
              closingEntryNumber,
              closedBy,
              closedAt: closedAt.toISOString(),
            }),
            performedById: auth.session.userId,
          },
        });

        return {
          closedYear: currentFy.name,
          activeYear: nextSpec.nextFyName,
          netSurplusTransferred: netSurplus.toFixed(2),
          closingEntryNumber,
          closedBy,
          closedAt: closedAt.toISOString(),
        };
      });

      return NextResponse.json({
        success: true,
        message: `Financial Year ${result.closedYear} closed successfully. Active year is now ${result.activeYear}.`,
        ...result,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
