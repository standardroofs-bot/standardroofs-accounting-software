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

  // Ensure VoucherSequence for INVOICE is strictly set to nextNumber: 33
  const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
  if (fy) {
    await prisma.voucherSequence.upsert({
      where: {
        financialYearId_voucherType: {
          financialYearId: fy.id,
          voucherType: 'INVOICE',
        },
      },
      update: {
        prefix: 'SR/26-27/',
        nextNumber: 33,
        paddingLength: 4,
      },
      create: {
        financialYearId: fy.id,
        voucherType: 'INVOICE',
        prefix: 'SR/26-27/',
        nextNumber: 33,
        paddingLength: 4,
      },
    });
  }

  const vSeq = fy
    ? await prisma.voucherSequence.findUnique({
        where: { financialYearId_voucherType: { financialYearId: fy.id, voucherType: 'INVOICE' } },
      })
    : null;

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
        voucherSequenceForInvoice: vSeq,
        nextInvoiceCalculation: {
          systemSettingsLastInvoiceNumber: settings?.lastInvoiceNumber,
          nextInvoiceNumberFromSystemSettings: (settings?.lastInvoiceNumber || 0) + 1,
          companySettingsInvoiceNextNo: company?.invoiceNextNo,
          voucherSequenceNextNumber: vSeq?.nextNumber,
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
