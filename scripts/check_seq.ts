import { prisma } from "../src/lib/prisma";

async function main() {
  const entries = await prisma.journalEntry.findMany({
    where: {
      entryNumber: {
        contains: "0033",
      },
    },
  });
  console.log("Journal entries with 0033:", entries);

  // Also check all journal entries >= 33 or containing SR/26-27
  const srEntries = await prisma.journalEntry.findMany({
    where: {
      entryNumber: {
        contains: "SR/26-27",
      },
    },
    select: { id: true, entryNumber: true, narration: true },
  });
  console.log("SR journal entries:", srEntries);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
