import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Cleaning Test Invoice & Lucas Sinclair Customer ---');

  // Find all invoices with id 'cmwnch4pq000zwdjgqlzlgxda' or sequence >= 33 or Lucas Sinclair
  const testInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { id: 'cmwnch4pq000zwdjgqlzlgxda' },
        { invoiceNumber: { contains: '0033' } },
        { sequenceNumber: { gte: 33 } },
        { customer: { name: { contains: 'Lucas Sinclair', mode: 'insensitive' } } },
      ],
    },
    include: { customer: true },
  });

  console.log(`Found ${testInvoices.length} test invoices to delete:`);
  for (const inv of testInvoices) {
    console.log(`- Deleting Invoice ${inv.invoiceNumber} (ID: ${inv.id}) for customer: ${inv.customer?.name}`);
    if (inv.journalEntryId) {
      await prisma.journalLine.deleteMany({ where: { journalEntryId: inv.journalEntryId } });
      await prisma.journalEntry.delete({ where: { id: inv.journalEntryId } });
    }
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoice.delete({ where: { id: inv.id } });
  }

  // Delete Lucas Sinclair customer
  const lucasCustomers = await prisma.customer.findMany({
    where: { name: { contains: 'Lucas Sinclair', mode: 'insensitive' } },
  });
  console.log(`Found ${lucasCustomers.length} Lucas Sinclair customers to delete.`);
  for (const c of lucasCustomers) {
    // Delete any estimates, salesOrders, invoices for this customer
    await prisma.invoice.deleteMany({ where: { customerId: c.id } });
    await prisma.estimate.deleteMany({ where: { customerId: c.id } });
    await prisma.salesOrder.deleteMany({ where: { customerId: c.id } });
    await prisma.journalLine.deleteMany({ where: { customerId: c.id } });
    await prisma.customer.delete({ where: { id: c.id } });
    console.log(`- Deleted Customer ${c.name} (ID: ${c.id})`);
  }

  // Reset SystemSettings lastInvoiceNumber strictly to 32
  await prisma.systemSettings.updateMany({
    data: { lastInvoiceNumber: 32 },
  });

  // Reset CompanySettings invoiceNextNo to 33
  await prisma.companySettings.updateMany({
    data: { invoiceNextNo: 33 },
  });

  // Reset VoucherSequence for INVOICE to nextNumber: 33
  const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
  if (fy) {
    await prisma.voucherSequence.upsert({
      where: { financialYearId_voucherType: { financialYearId: fy.id, voucherType: 'INVOICE' } },
      update: { nextNumber: 33, prefix: 'SR/26-27/', paddingLength: 4 },
      create: { financialYearId: fy.id, voucherType: 'INVOICE', nextNumber: 33, prefix: 'SR/26-27/', paddingLength: 4 },
    });
  }

  console.log('✓ Database cleaned. Next invoice is strictly #33 (SR/26-27/0033).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
