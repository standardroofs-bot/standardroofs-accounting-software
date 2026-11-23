const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const STAFF_PASSWORDS = {
  "sr001@standardroofs.com": "SR001@2026",
  "sr002@standardroofs.com": "SR002@2026",
  "sr003@standardroofs.com": "SR003@2026",
  "sr004@standardroofs.com": "SR004@2026",
  "sr005@standardroofs.com": "SR005@2026",
  "sr006@standardroofs.com": "SR006@2026",
  "sr007@standardroofs.com": "SR007@2026",
  "sr008@standardroofs.com": "SR008@2026",
  "sr009@standardroofs.com": "SR009@2026",
  "sr010@standardroofs.com": "SR010@2026",
};

async function main() {
  console.log("Updating unique individual passwords for SR001 - SR010...");
  for (const [email, plainPwd] of Object.entries(STAFF_PASSWORDS)) {
    const passwordHash = await bcrypt.hash(plainPwd, 10);
    const updated = await prisma.user.updateMany({
      where: { email },
      data: { passwordHash },
    });
    console.log(`Updated ${email} (${plainPwd}): ${updated.count} user record(s)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
