const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      employeeId: true,
      active: true,
    }
  });
  console.log('--- ALL DB USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const officeEmps = await prisma.employeeOrLabour.findMany({
    where: { category: 'OFFICE_STAFF' },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      role: true,
      designation: true,
      companyUnit: true,
    },
    orderBy: { employeeCode: 'asc' }
  });
  console.log('--- ALL OFFICE STAFF ---');
  console.log(JSON.stringify(officeEmps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
