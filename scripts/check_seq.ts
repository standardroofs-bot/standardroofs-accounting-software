import { prisma } from "../src/lib/prisma";

async function main() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { sequenceNumber: "desc" },
    include: { customer: true },
  });
  console.log(`Found ${invoices.length} invoices:`);
  for (const inv of invoices) {
    console.log({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      seq: inv.sequenceNumber,
      customer: inv.customer?.name,
      journalEntryId: inv.journalEntryId,
    });
  }

  const sys = await prisma.systemSettings.findFirst();
  const vs = await prisma.voucherSequence.findFirst({ where: { voucherType: "INVOICE" } });
  console.log({ sysLast: sys?.lastInvoiceNumber, vsNext: vs?.nextNumber });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
