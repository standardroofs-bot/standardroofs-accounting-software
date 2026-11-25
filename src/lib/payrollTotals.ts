import { PrismaClient } from "@prisma/client";

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
    paidBank: Math.round(allItems.reduce((s, it) => s + it.paidBankOrGpay, 0) * 100) / 100,
  };

  return prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: totals,
  });
}
