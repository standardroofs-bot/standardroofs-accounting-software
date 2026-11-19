import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Verifying Neon Cloud PostgreSQL Database ---');
  const users = await prisma.user.count();
  const roofing = await prisma.roofingSystemMaster.count();
  const colors = await prisma.productColorMaster.count();
  const bankAccounts = await prisma.bankAccount.findMany({
    select: { accountNumber: true, accountName: true, currentBalance: true, openingBalance: true },
  });
  const machines = await prisma.machineAsset.count();
  const materials = await prisma.materialItem.count();
  const tiles = await prisma.tilesInventory.count();
  const checklists = await prisma.preDispatchChecklist.count();
  const uncategorizedTxns = await prisma.bankTransaction.count();
  const company = await prisma.companySettings.findFirst({
    select: {
      companyName: true,
      gstin: true,
      bankName: true,
      bankAccountNo: true,
      bankBranch: true,
      bankIfsc: true,
      invoiceFormat: true,
      invoiceNextNo: true,
    },
  });
  const settings = await prisma.systemSettings.findFirst();

  console.log(
    JSON.stringify(
      {
        users,
        roofingSystems: roofing,
        productColors: colors,
        machines,
        materials,
        tilesInventory: tiles,
        preDispatchChecklists: checklists,
        uncategorizedBankTransactions: uncategorizedTxns,
        company,
        bankAccounts: bankAccounts.map((b) => ({
          ...b,
          currentBalance: b.currentBalance.toString(),
          openingBalance: b.openingBalance.toString(),
        })),
        systemSettings: settings,
        nextInvoiceCalculation: {
          systemSettingsLastInvoiceNumber: settings?.lastInvoiceNumber,
          nextInvoiceNumberFromSystemSettings: (settings?.lastInvoiceNumber || 0) + 1,
          companySettingsInvoiceNextNo: company?.invoiceNextNo,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
