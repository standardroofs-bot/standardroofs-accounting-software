import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { getStorageService } from "@/lib/storage";
import { CashFlowType, VoucherType } from "@prisma/client";
import { toDecimal } from "@/lib/decimal";

const STANDARD_WALLETS = [
  "Office Cash",
  "ICICI",
  "Office Gpay",
  "Ravi Gpay",
  "Prabha Gpay",
  "RBL",
  "Periyasamy Gpay",
  "Suji Cash",
];

function normalizeWalletName(raw?: string | null): string {
  const s = (raw || "Office Cash").trim();
  const lower = s.toLowerCase();
  if (lower.includes("office cash")) return "Office Cash";
  if (lower.includes("icici")) return "ICICI";
  if (lower.includes("office gpay")) return "Office Gpay";
  if (lower.includes("ravi")) return "Ravi Gpay";
  if (lower.includes("prabha")) return "Prabha Gpay";
  if (lower.includes("rbl")) return "RBL";
  if (lower.includes("periyasamy")) return "Periyasamy Gpay";
  if (lower.includes("suji")) return "Suji Cash";
  return s || "Office Cash";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const walletFilter = searchParams.get("wallet");
    const categoryFilter = searchParams.get("category");

    const fy =
      (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
      (await prisma.financialYear.findFirst());

    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const allFyEntries = await prisma.cashBookEntry.findMany({
      where: { financialYearId: fy.id },
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
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // Compute live 8-wallet balances from all FY entries
    const walletMap: Record<string, number> = {};
    for (const w of STANDARD_WALLETS) walletMap[w] = 0;

    for (const e of allFyEntries) {
      const w = normalizeWalletName(e.walletName);
      if (walletMap[w] === undefined) walletMap[w] = 0;
      const amt = Number(e.amount);
      walletMap[w] += e.type === CashFlowType.CASH_INFLOW ? amt : -amt;
    }

    const walletBalances = STANDARD_WALLETS.map((w) => ({
      walletName: w,
      balance: Math.round((walletMap[w] || 0) * 100) / 100,
    }));

    // Filter entries for table
    const entries = allFyEntries.filter((e) => {
      if (date) {
        const dStr = new Date(e.date).toISOString().slice(0, 10);
        if (dStr !== date) return false;
      }
      if (walletFilter && walletFilter !== "ALL") {
        if (normalizeWalletName(e.walletName) !== walletFilter) return false;
      }
      if (categoryFilter && categoryFilter !== "ALL") {
        if (e.category !== categoryFilter) return false;
      }
      return true;
    });

    const totalInflow = entries
      .filter((e) => e.type === CashFlowType.CASH_INFLOW)
      .reduce((sum, e) => sum.plus(toDecimal(e.amount)), toDecimal(0));

    const totalOutflow = entries
      .filter((e) => e.type === CashFlowType.CASH_OUTFLOW)
      .reduce((sum, e) => sum.plus(toDecimal(e.amount)), toDecimal(0));

    const totalAllWallets = walletBalances.reduce((s, w) => s + w.balance, 0);

    return NextResponse.json({
      success: true,
      currentCashBalance: totalAllWallets.toFixed(2),
      totalInflow: totalInflow.toFixed(2),
      totalOutflow: totalOutflow.toFixed(2),
      walletBalances,
      entries,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let type = "CASH_OUTFLOW";
    let amountStr = "0";
    let purpose = "";
    let category = "General Site Expense";
    let walletName = "Office Cash";
    let counterpartyName = "";
    let targetAccountId = "";
    let projectId: string | null = null;
    let dateStr = "";
    let receiptFile: File | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      type = body.type || "CASH_OUTFLOW";
      amountStr = String(body.amount || "0");
      purpose = body.purpose || "";
      category = body.category || "General Site Expense";
      walletName = normalizeWalletName(body.walletName);
      counterpartyName = body.counterpartyName || "";
      targetAccountId = body.targetAccountId || "";
      projectId = body.projectId || null;
      dateStr = body.date || "";
    } else {
      const formData = await request.formData();
      type = (formData.get("type") as string) || "CASH_OUTFLOW";
      amountStr = (formData.get("amount") as string) || "0";
      purpose = (formData.get("purpose") as string) || "";
      category = (formData.get("category") as string) || "General Site Expense";
      walletName = normalizeWalletName(formData.get("walletName") as string);
      counterpartyName = (formData.get("counterpartyName") as string) || "";
      targetAccountId = (formData.get("targetAccountId") as string) || "";
      projectId = (formData.get("projectId") as string) || null;
      dateStr = (formData.get("date") as string) || "";
      receiptFile = formData.get("receipt") as File | null;
    }

    if (!type || !amountStr || !purpose) {
      return NextResponse.json(
        { success: false, error: "Type, Amount, and Purpose are required" },
        { status: 400 }
      );
    }

    const amount = toDecimal(amountStr);
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero" }, { status: 400 });
    }

    const fy =
      (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
      (await prisma.financialYear.findFirst());
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "No system user found" }, { status: 500 });
    }

    const cashAccount = await prisma.account.findFirst({
      where: { subType: "CASH" },
    });

    if (!targetAccountId) {
      const fallback = await prisma.account.findFirst({
        where: { type: type === CashFlowType.CASH_INFLOW ? "INCOME" : "EXPENSE" },
      });
      if (fallback) targetAccountId = fallback.id;
    }

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

    const voucherSeqType = type === CashFlowType.CASH_INFLOW ? "CASH_RECEIPT" : "CASH_PAYMENT";
    const voucherInfo = await getNextVoucherNumber(fy.id, voucherSeqType);
    const entryDate = dateStr ? new Date(dateStr) : new Date();

    let journalEntryId: string | null = null;
    if (cashAccount && targetAccountId) {
      const journalLines =
        type === CashFlowType.CASH_INFLOW
          ? [
              { accountId: cashAccount.id, debit: amount, credit: 0, narration: `${walletName}: ${purpose}`, projectId: projectId || undefined },
              { accountId: targetAccountId, debit: 0, credit: amount, narration: `${walletName}: ${purpose}`, projectId: projectId || undefined },
            ]
          : [
              { accountId: targetAccountId, debit: amount, credit: 0, narration: `${walletName}: ${purpose}`, projectId: projectId || undefined },
              { accountId: cashAccount.id, debit: 0, credit: amount, narration: `${walletName}: ${purpose}`, projectId: projectId || undefined },
            ];

      const je = await postDoubleEntryTransaction({
        voucherType: type === CashFlowType.CASH_INFLOW ? VoucherType.RECEIPT : VoucherType.PAYMENT,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: entryDate,
        narration: `Cash Book (${walletName}): ${purpose}`,
        createdById: defaultUser.id,
        lines: journalLines,
      });
      journalEntryId = je.id;
    }

    const cashEntry = await prisma.cashBookEntry.create({
      data: {
        voucherNumber: voucherInfo.voucherNumber,
        date: entryDate,
        type: type as CashFlowType,
        amount: amount.toFixed(2),
        purpose,
        category,
        walletName,
        counterpartyName: counterpartyName || null,
        receiptUrl,
        projectId,
        financialYearId: fy.id,
        journalEntryId,
        createdById: defaultUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      entry: cashEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
