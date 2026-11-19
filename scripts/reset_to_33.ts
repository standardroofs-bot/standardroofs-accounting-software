import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Cleaning test invoices >= 33...");

  // Find all invoices with sequenceNumber >= 33 or invoiceNumber containing 0033/0034/0035
  const testInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { sequenceNumber: { gte: 33 } },
        { invoiceNumber: { contains: "0033" } },
        { invoiceNumber: { contains: "0034" } },
        { invoiceNumber: { contains: "0035" } },
      ],
    },
    include: { items: true, payments: true },
  });

  console.log(`Found ${testInvoices.length} test invoices to remove.`);

  for (const inv of testInvoices) {
    console.log(`Deleting Invoice ${inv.invoiceNumber} (ID: ${inv.id})`);

    // 1. Delete invoice items
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: inv.id },
    });

    // 2. Delete invoice payments
    await prisma.invoicePayment.deleteMany({
      where: { invoiceId: inv.id },
    });

    // 3. Delete invoice
    await prisma.invoice.delete({
      where: { id: inv.id },
    });

    // 4. Delete journal entry if exists
    if (inv.journalEntryId) {
      await prisma.journalLine.deleteMany({
        where: { journalEntryId: inv.journalEntryId },
      });
      await prisma.journalEntry.delete({
        where: { id: inv.journalEntryId },
      }).catch((e) => console.log("Journal delete note:", e.message));
    }
  }

  // Also clean any orphan journal entries for 0033, 0034, 0035
  const orphanJournals = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { entryNumber: { contains: "0033" } },
        { entryNumber: { contains: "0034" } },
        { entryNumber: { contains: "0035" } },
      ],
    },
  });
  for (const j of orphanJournals) {
    await prisma.journalLine.deleteMany({ where: { journalEntryId: j.id } });
    await prisma.journalEntry.delete({ where: { id: j.id } });
  }

  // Delete test customers created during testing if they have no remaining invoices
  const testCustomerNames = ["Kavin", "Sujithra M", "Rajesh Kumar", "Lucas Sinclair"];
  for (const name of testCustomerNames) {
    const custs = await prisma.customer.findMany({ where: { name } });
    for (const c of custs) {
      const invCount = await prisma.invoice.count({ where: { customerId: c.id } });
      if (invCount === 0) {
        await prisma.customer.delete({ where: { id: c.id } }).catch((e) => console.log("Customer delete note:", e.message));
        console.log(`Deleted test customer: ${name}`);
      }
    }
  }

  // Reset sequence in SystemSettings and VoucherSequence
  await prisma.systemSettings.updateMany({
    data: {
      lastInvoiceNumber: 32,
    },
  });

  await prisma.voucherSequence.updateMany({
    where: { voucherType: "INVOICE" },
    data: {
      nextNumber: 33,
    },
  });

  // Also check CompanySettings invoiceNextNo
  const company = await prisma.companySettings.findFirst();
  if (company) {
    await prisma.companySettings.update({
      where: { id: company.id },
      data: {
        invoiceNextNo: 33,
      },
    });
  }

  console.log("Invoice sequence reset successfully to #33.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
