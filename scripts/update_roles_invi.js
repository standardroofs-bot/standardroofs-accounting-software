const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // 1. Clear role & designation for Invi001, Invi002, Invi003 (keep them in EmployeeOrLabour & /attendance)
  const updatedInvi = await prisma.employeeOrLabour.updateMany({
    where: { employeeCode: { in: ['Invi001', 'Invi002', 'Invi003'] } },
    data: { role: null, designation: null }
  });
  console.log('Cleared role/designation for Invi staff count:', updatedInvi.count);

  // 2. Ensure Monika SR002 user has role HR_MANAGER for Tier 2 access
  const monikaUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: 'sr002@standardroofs.com' },
        { email: 'hr@standardroofs.com' },
        { employeeId: (await prisma.employeeOrLabour.findFirst({ where: { employeeCode: 'SR002' } }))?.id }
      ]
    }
  });
  console.log('Found Monika / HR users:', monikaUsers.map(u => ({ email: u.email, role: u.role })));

  for (const u of monikaUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: { role: 'HR_MANAGER' }
    });
  }
  console.log('Updated Monika / HR users to HR_MANAGER');

  // 3. Deactivate any separate login for Invi staff to restrict ESS to SR001-SR010 only
  const inviEmps = await prisma.employeeOrLabour.findMany({
    where: { employeeCode: { in: ['Invi001', 'Invi002', 'Invi003'] } }
  });
  const inviIds = inviEmps.map(e => e.id);
  const deactivatedInviUsers = await prisma.user.updateMany({
    where: {
      OR: [
        { employeeId: { in: inviIds } },
        { email: { in: ['invi001@standardroofs.com', 'invi002@standardroofs.com', 'invi003@standardroofs.com'] } }
      ]
    },
    data: { active: false }
  });
  console.log('Deactivated Invi user login accounts:', deactivatedInviUsers.count);

  // 4. Verify Invi staff records
  const verifyInvi = await prisma.employeeOrLabour.findMany({
    where: { employeeCode: { in: ['Invi001', 'Invi002', 'Invi003'] } }
  });
  console.log('Invi records now:');
  verifyInvi.forEach(i => {
    console.log(`- ${i.employeeCode}: ${i.name} | Role: "${i.role}" | Designation: "${i.designation}" | Company: "${i.companyUnit}"`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
