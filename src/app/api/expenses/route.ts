import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { getStorageService } from "@/lib/storage";
import { toDecimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const isOffice = searchParams.get("isOffice");
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (isOffice !== null && isOffice !== undefined && isOffice !== "") {
      where.isOfficeExpense = isOffice === "true";
    }

    const expenses = await prisma.expenseClaim.findMany({
      where,
      include: {
        account: { select: { id: true, code: true, name: true } },
        bankAccount: { select: { id: true, accountName: true, bankName: true } },
        project: { select: { id: true, code: true, name: true } },
        employee: { select: { id: true, name: true, employeeCode: true } },
        supplier: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const accountId = formData.get("accountId") as string;
    const amountStr = formData.get("amount") as string;
    const purpose = formData.get("purpose") as string;
    const paymentMode = (formData.get("paymentMode") as string) || "CASH"; // CASH, BANK
    const bankAccountId = (formData.get("bankAccountId") as string) || null;
    const isOfficeExpense = formData.get("isOfficeExpense") === "true";
    const projectId = isOfficeExpense ? null : ((formData.get("projectId") as string) || null);
    const employeeId = (formData.get("employeeId") as string) || null;
    const supplierId = (formData.get("supplierId") as string) || null;
    const category = (formData.get("category") as string) || (isOfficeExpense ? "OFFICE_OVERHEAD" : "SITE_MISC");
    const teamName = (formData.get("teamName") as string) || (isOfficeExpense ? "Office" : "SRM01");
    const receiptFile = formData.get("receipt") as File | null;

    if (!accountId || !amountStr || !purpose) {
      return NextResponse.json({ success: false, error: "Expense Account, Amount and Purpose are required." }, { status: 400 });
    }

    const amount = toDecimal(amountStr);
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero." }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();
    const expenseAccount = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });

    let creditAccountId = cashAccount.id;
    let bankAccount: any = null;

    if (paymentMode === "BANK") {
      if (bankAccountId) {
        bankAccount = await prisma.bankAccount.findUniqueOrThrow({ where: { id: bankAccountId } });
        creditAccountId = bankAccount.accountId;
      } else {
        const defaultBank = await prisma.bankAccount.findFirst({ where: { accountNumber: "50200012345678" } });
        if (defaultBank) {
          bankAccount = defaultBank;
          creditAccountId = defaultBank.accountId;
        }
      }
    }

    // Handle receipt file upload if provided
    let receiptUrl: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const storage = getStorageService();
      const uploadRes = await storage.uploadFile({
        financialYear: fy.name,
        module: "vouchers",
        filename: receiptFile.name,
        buffer,
        contentType: receiptFile.type,
      });
      receiptUrl = uploadRes.url;
    }

    const voucherInfo = await getNextVoucherNumber(fy.id, "EXPENSE");
    const voucherNumber = voucherInfo.voucherNumber;

    // Post Double-Entry Journal:
    // Debit: Expense Account
    // Credit: Cash in Hand (1010) or Bank Account
    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.EXPENSE,
      financialYearId: fy.id,
      entryNumber: voucherNumber,
      date: new Date(),
      narration: `${isOfficeExpense ? "Office Overhead" : "Site Expense"} [${expenseAccount.name}]: ${purpose} (Paid via ${paymentMode})`,
      createdById: defaultUser.id,
      lines: [
        {
          accountId: expenseAccount.id,
          debit: amount,
          credit: 0,
          narration: purpose,
          projectId: isOfficeExpense ? undefined : projectId || undefined,
          supplierId: supplierId || undefined,
        },
        {
          accountId: creditAccountId,
          debit: 0,
          credit: amount,
          narration: `Fund payout for ${purpose}`,
          projectId: isOfficeExpense ? undefined : projectId || undefined,
          supplierId: supplierId || undefined,
        },
      ],
    });

    // Update Bank Account balance if paid via bank
    if (bankAccount) {
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          currentBalance: toDecimal(bankAccount.currentBalance).minus(amount).toFixed(2),
        },
      });
      await prisma.bankTransaction.create({
        data: {
          voucherNumber,
          date: new Date(),
          bankAccountId: bankAccount.id,
          type: "WITHDRAWAL",
          amount: amount.toFixed(2),
          payeeOrPayer: purpose,
          purpose: `${isOfficeExpense ? "Office Overhead" : "Site Expense"}: ${expenseAccount.name}`,
          journalEntryId: journalEntry.id,
        },
      });
    }

    const expenseClaim = await prisma.expenseClaim.create({
      data: {
        voucherNumber,
        date: new Date(),
        accountId,
        paymentMode,
        bankAccountId: bankAccount ? bankAccount.id : null,
        projectId: isOfficeExpense ? null : projectId,
        employeeId,
        supplierId,
        amount: amount.toFixed(2),
        purpose,
        category,
        isOfficeExpense,
        teamName,
        receiptUrl,
        status: "APPROVED",
        approvedById: defaultUser.id,
        approvedAt: new Date(),
        journalEntryId: journalEntry.id,
      },
      include: { account: true, project: true },
    });

    return NextResponse.json({ success: true, expense: expenseClaim, journalEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
