import { prisma } from "../src/lib/prisma";

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: { items: true, customer: true },
    orderBy: { sequenceNumber: "desc" },
  });
  console.log(`Found ${invoices.length} invoices:`);
  for (const inv of invoices) {
    console.log({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      sequenceNumber: inv.sequenceNumber,
      customer: inv.customer?.name,
      subTotal: inv.subTotal,
      cgst: inv.cgstTotal,
      sgst: inv.sgstTotal,
      adj: inv.adjustment,
      total: inv.totalAmount,
      status: inv.status,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
