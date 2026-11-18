import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET() {
  try {
    const templates = await prisma.recurringTemplate.findMany({
      orderBy: { nextDueDate: "asc" },
    });
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, templateId, templateName, type, frequency, nextDueDate, category, amount, description } = body;

    // 1. Generate Now (1-Click execution of due recurring template)
    if (action === "GENERATE_NOW") {
      if (!templateId) {
        return NextResponse.json({ success: false, error: "templateId is required." }, { status: 400 });
      }

      const template = await prisma.recurringTemplate.findUniqueOrThrow({ where: { id: templateId } });
      const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
      const user = await prisma.user.findFirstOrThrow();

      let voucherNumber = "";

      if (template.type === "EXPENSE") {
        const voucherInfo = await getNextVoucherNumber(fy.id, "EXPENSE");
        voucherNumber = voucherInfo.voucherNumber;

        // Debit Expense Account, Credit Bank Account
        const expenseAccount = await prisma.account.findFirstOrThrow({
          where: {
            OR: [
              { code: "5030" }, // Site/Office Expense
              { name: { contains: "Rent" } },
            ],
          },
        });
        const bankAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1020" } });

        await postDoubleEntryTransaction({
          voucherType: VoucherType.EXPENSE,
          financialYearId: fy.id,
          entryNumber: voucherNumber,
          date: new Date(),
          narration: `Recurring Auto-Voucher: ${template.templateName} (${template.description})`,
          referenceNumber: voucherNumber,
          createdById: user.id,
          lines: [
            { accountId: expenseAccount.id, debit: template.amount, credit: 0, narration: template.description },
            { accountId: bankAccount.id, debit: 0, credit: template.amount, narration: "Bank auto-debit" },
          ],
        });
      }

      // Increment nextDueDate based on frequency
      const nextDate = new Date(template.nextDueDate);
      if (template.frequency === "WEEKLY") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (template.frequency === "QUARTERLY") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else {
        // MONTHLY default
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const updated = await prisma.recurringTemplate.update({
        where: { id: templateId },
        data: {
          lastGeneratedDate: new Date(),
          nextDueDate: nextDate,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Recurring voucher ${voucherNumber} generated successfully! Next due date set to ${nextDate.toISOString().split("T")[0]}.`,
        template: updated,
      });
    }

    // 2. Create Recurring Template
    if (!templateName || !type || !amount || !nextDueDate) {
      return NextResponse.json({ success: false, error: "Template Name, Type, Amount and Due Date are required." }, { status: 400 });
    }

    const template = await prisma.recurringTemplate.create({
      data: {
        templateName,
        type,
        frequency: frequency || "MONTHLY",
        nextDueDate: new Date(nextDueDate),
        category: category || "Office & Operations",
        amount: toDecimal(amount).toFixed(2),
        description: description || "Scheduled recurring accounting transaction",
        active: true,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Recurring error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
