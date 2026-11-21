import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

async function main() {
  console.log("Seeding login accounts for Office Staff...");

  const officeStaff = await prisma.employeeOrLabour.findMany({
    where: { category: "OFFICE_STAFF" },
  });

  const defaultPasswordHash = await bcrypt.hash("employee123", 10);

  for (const emp of officeStaff) {
    const email = `${emp.employeeCode.toLowerCase()}@standardroofs.com`;
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { employeeId: emp.id },
        ],
      },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          employeeId: emp.id,
          role: UserRole.EMPLOYEE,
          active: true,
        },
      });
      console.log(`Updated user for ${emp.name} (${emp.employeeCode}): ${email}`);
    } else {
      await prisma.user.create({
        data: {
          name: emp.name,
          email,
          passwordHash: defaultPasswordHash,
          role: UserRole.EMPLOYEE,
          employeeId: emp.id,
          phone: emp.phone || null,
          active: true,
        },
      });
      console.log(`Created user for ${emp.name} (${emp.employeeCode}): ${email} / employee123`);
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
