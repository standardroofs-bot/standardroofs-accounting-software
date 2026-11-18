import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { getStorageService } from "@/lib/storage";
import { CashFlowType, VoucherType } from "@prisma/client";
import { toDecimal } from "@/lib/decimal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD (optional)

    const fy = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const whereClause: any = { financialYearId: fy.id };
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    }

    const entries = await prisma.cashBookEntry.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true, code: true } },
        journalEntry: {
          include: {
            lines: {
              include: {
                account: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get Cash in Hand account balance
    const cashAccount = await prisma.account.findUnique({
      where: { code: "1010" },
    });

    const totalInflow = entries
      .filter((e) => e.type === CashFlowType.CASH_INFLOW)
      .reduce((sum, e) => sum.plus(toDecimal(e.amount)), toDecimal(0));

    const totalOutflow = entries
      .filter((e) => e.type === CashFlowType.CASH_OUTFLOW)
      .reduce((sum, e) => sum.plus(toDecimal(e.amount)), toDecimal(0));

    return NextResponse.json({
      success: true,
      currentCashBalance: cashAccount ? toDecimal(cashAccount.currentBalance).toFixed(2) : "0.00",
      totalInflow: totalInflow.toFixed(2),
      totalOutflow: totalOutflow.toFixed(2),
      entries,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = formData.get("type") as string; // CASH_INFLOW | CASH_OUTFLOW
    const amountStr = formData.get("amount") as string;
    const purpose = formData.get("purpose") as string;
    const category = (formData.get("category") as string) || "General Site Expense";
    const counterpartyName = formData.get("counterpartyName") as string;
    const targetAccountId = formData.get("targetAccountId") as string; // Opposing COA account
    const projectId = (formData.get("projectId") as string) || null;
    const receiptFile = formData.get("receipt") as File | null;

    if (!type || !amountStr || !purpose || !targetAccountId) {
      return NextResponse.json(
        { success: false, error: "Type, Amount, Purpose and Account are required" },
        { status: 400 }
      );
    }

    const amount = toDecimal(amountStr);
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero" }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "No system user found" }, { status: 500 });
    }

    const cashAccount = await prisma.account.findUniqueOrThrow({
      where: { code: "1010" },
    });

    // Handle receipt upload if provided
    let receiptUrl: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const storage = getStorageService();
      const uploadRes = await storage.uploadFile({
        financialYear: fy.name,
        module: "cashbook",
        filename: receiptFile.name,
        buffer,
        contentType: receiptFile.type,
      });
      receiptUrl = uploadRes.url;
    }

    // Determine voucher sequence type and number
    const voucherSeqType = type === CashFlowType.CASH_INFLOW ? "CASH_RECEIPT" : "CASH_PAYMENT";
    const voucherInfo = await getNextVoucherNumber(fy.id, voucherSeqType);

    // Prepare Double-Entry Journal Lines:
    // Inflow: Debit Cash in Hand (1010), Credit Target Account
    // Outflow: Debit Target Account, Credit Cash in Hand (1010)
    const journalLines =
      type === CashFlowType.CASH_INFLOW
        ? [
            {
              accountId: cashAccount.id,
              debit: amount,
              credit: 0,
              narration: `Cash Received: ${purpose}`,
              projectId: projectId || undefined,
            },
            {
              accountId: targetAccountId,
              debit: 0,
              credit: amount,
              narration: `Cash Received: ${purpose}`,
              projectId: projectId || undefined,
            },
          ]
        : [
            {
              accountId: targetAccountId,
              debit: amount,
              credit: 0,
              narration: `Cash Paid: ${purpose}`,
              projectId: projectId || undefined,
            },
            {
              accountId: cashAccount.id,
              debit: 0,
              credit: amount,
              narration: `Cash Paid: ${purpose}`,
              projectId: projectId || undefined,
            },
          ];

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: type === CashFlowType.CASH_INFLOW ? VoucherType.RECEIPT : VoucherType.PAYMENT,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: new Date(),
      narration: `Cash Book: ${purpose} (${counterpartyName || "Counterparty"})`,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Create the CashBookEntry linked to the JournalEntry
    const cashEntry = await prisma.cashBookEntry.create({
      data: {
        voucherNumber: voucherInfo.voucherNumber,
        date: new Date(),
        type: type as CashFlowType,
        amount: amount.toFixed(2),
        purpose,
        category,
        counterpartyName: counterpartyName || null,
        receiptUrl,
        projectId,
        financialYearId: fy.id,
        journalEntryId: journalEntry.id,
        createdById: defaultUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      entry: cashEntry,
      journalEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
