import { PrismaClient, PayrollItem, PayrollRun } from "@prisma/client";

export function normalizeCashBookWalletName(wallet?: string | null): string {
  const raw = (wallet || "").trim();
  const lower = raw.toLowerCase();
  if (lower === "office gpay" || lower === "office_gpay") return "Office Gpay";
  if (lower === "ravi gpay") return "Ravi Gpay";
  if (lower === "prabha gpay") return "Prabha Gpay";
  if (lower === "periyasamy gpay") return "Periyasamy Gpay";
  if (lower === "suji cash") return "Suji Cash";
  if (lower === "icici") return "ICICI";
  if (lower === "rbl") return "RBL";
  if (lower === "office cash" || lower === "cash") return "Office Cash";
  return raw || "Office Gpay";
}

export async function recalculatePayrollRunTotals(payrollRunId: string, prisma: PrismaClient) {
  const allItems = await prisma.payrollItem.findMany({
    where: { payrollRunId },
  });

  const totals = {
    totalGross: Math.round(allItems.reduce((s, it) => s + it.grossSalary, 0) * 100) / 100,
    totalDeductions:
      Math.round(allItems.reduce((s, it) => s + it.advanceDeduction + it.expenseBalanceDeduction, 0) * 100) / 100,
    totalNet: Math.round(allItems.reduce((s, it) => s + it.netSalary, 0) * 100) / 100,
    paidCash: Math.round(allItems.reduce((s, it) => s + it.paidCash, 0) * 100) / 100,
    paidBank: Math.round(allItems.reduce((s, it) => s + it.paidBankOrGpay + (it.paidGpay || 0), 0) * 100) / 100,
  };

  return prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: totals,
  });
}

export function getPayrollItemVoucherPrefix(month: string, itemId: string): string {
  return `CP/PAY/${month.replace("-", "")}/${itemId.slice(-5).toUpperCase()}`;
}

/**
 * Idempotently syncs or cleans up CashBookEntry legs (-CASH, -BANK, -GPAY)
 * for a single PayrollItem so 8-wallet balances and Bank Statements stay 1:1.
 */
export async function syncPayrollItemCashBookLegs(
  prisma: PrismaClient,
  item: PayrollItem,
  payrollRun: Pick<PayrollRun, "month" | "cycleType" | "companyId">,
  options?: {
    bankWallet?: string | null;
    gpayWallet?: string | null;
    syncToCashBook?: boolean;
  }
) {
  const prefix = getPayrollItemVoucherPrefix(payrollRun.month, item.id);
  const legVouchers = [`${prefix}-CASH`, `${prefix}-BANK`, `${prefix}-GPAY`];

  if (options?.syncToCashBook === false) {
    return;
  }

  const fy =
    (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
    (await prisma.financialYear.findFirst({ orderBy: { startDate: "desc" } }));
  const sysUser =
    (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })) ||
    (await prisma.user.findFirst());

  if (!fy || !sysUser) return;

  const companyId = payrollRun.companyId || "standard-roofs";
  const isOffice = item.category === "OFFICE" || payrollRun.cycleType === "MONTHLY_OFFICE";
  const category = isOffice ? "Employee Salary" : "Labour Wages";
  const refSuffix = item.paymentRef ? ` [Ref: ${item.paymentRef}]` : "";
  const paidDate = item.paidDate || new Date();

  const bankWallet = normalizeCashBookWalletName(
    options?.bankWallet || (item.paymentChannel === "RBL" ? "RBL" : "ICICI")
  );
  const gpayWallet = normalizeCashBookWalletName(options?.gpayWallet || item.gpayWallet || "Office Gpay");

  const legs: Array<{ wallet: string; amount: number; tag: string; voucherNumber: string }> = [
    { wallet: "Office Cash", amount: Number(item.paidCash || 0), tag: "CASH", voucherNumber: legVouchers[0] },
    { wallet: bankWallet, amount: Number(item.paidBankOrGpay || 0), tag: "BANK", voucherNumber: legVouchers[1] },
    { wallet: gpayWallet, amount: Number(item.paidGpay || 0), tag: "GPAY", voucherNumber: legVouchers[2] },
  ];

  for (const leg of legs) {
    if (leg.amount <= 0) {
      await prisma.cashBookEntry.deleteMany({
        where: { voucherNumber: leg.voucherNumber },
      });
      continue;
    }

    const purpose = `${category} - ${item.employeeName} (${payrollRun.month})${refSuffix}`;
    await prisma.cashBookEntry.upsert({
      where: { voucherNumber: leg.voucherNumber },
      update: {
        date: paidDate,
        amount: leg.amount,
        purpose,
        category,
        walletName: leg.wallet,
        counterpartyName: item.employeeName,
        isOfficeExpense: isOffice,
        companyId,
      },
      create: {
        voucherNumber: leg.voucherNumber,
        date: paidDate,
        type: "CASH_OUTFLOW",
        amount: leg.amount,
        purpose,
        category,
        walletName: leg.wallet,
        counterpartyName: item.employeeName,
        isOfficeExpense: isOffice,
        companyId,
        financialYearId: fy.id,
        createdById: sysUser.id,
      },
    });
  }
}

export async function removePayrollItemCashBookLegs(
  prisma: PrismaClient,
  month: string,
  itemId: string
) {
  const prefix = getPayrollItemVoucherPrefix(month, itemId);
  await prisma.cashBookEntry.deleteMany({
    where: {
      voucherNumber: {
        in: [`${prefix}-CASH`, `${prefix}-BANK`, `${prefix}-GPAY`],
      },
    },
  });
}
