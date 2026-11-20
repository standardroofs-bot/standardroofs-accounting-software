const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empCount = await prisma.employeeOrLabour.count();
  const conCount = await prisma.contractor.count();
  console.log('EmployeeOrLabour count:', empCount);
  console.log('Contractor count:', conCount);
  if (empCount > 0) {
    const sample = await prisma.employeeOrLabour.findMany({ take: 5 });
    console.log('Sample employees:', sample);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
