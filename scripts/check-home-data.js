const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invCount = await prisma.invoice.count();
  const invoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { customer: true }
  });
  const billsCount = await prisma.purchaseBill.count();
  const bills = await prisma.purchaseBill.findMany({ take: 5 });
  const projects = await prisma.project.findMany({ take: 5, include: { customer: true } });
  const machines = await prisma.machineAsset.findMany({ take: 6 });
  const banks = await prisma.bankAccount.findMany();
  const accounts = await prisma.account.findMany({
    where: { currentBalance: { not: "0" } }
  });
  
  console.log("Invoices count:", invCount, invoices.map(i => ({ no: i.invoiceNumber, amt: i.totalAmount, bal: i.balanceDue, status: i.status, cust: i.customer?.name })));
  console.log("Bills count:", billsCount, bills);
  console.log("Projects count:", projects.length, projects.map(p => ({ code: p.code, name: p.name, loc: p.siteLocation })));
  console.log("Machines count:", machines.length, machines.map(m => ({ name: m.name, code: m.assetCode, count: m.srFinalCount })));
  console.log("Banks:", banks.map(b => ({ name: b.bankName, ac: b.accountNumber, bal: b.currentBalance })));
  console.log("Accounts with non-zero balance:", accounts.map(a => ({ code: a.code, name: a.name, bal: a.currentBalance })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
