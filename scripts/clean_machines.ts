import { prisma } from "../src/lib/prisma";

async function main() {
  const legacyMachines = await prisma.machineAsset.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { assetCode: { not: { startsWith: "SRM-0" } } }
      ]
    },
    select: { id: true }
  });
  const ids = legacyMachines.map(m => m.id);

  if (ids.length > 0) {
    await prisma.machineAllocation.deleteMany({ where: { machineId: { in: ids } } });
    await prisma.machineMovement.deleteMany({ where: { machineId: { in: ids } } });
    await prisma.machineServiceRepair.deleteMany({ where: { machineId: { in: ids } } });
    const deleted = await prisma.machineAsset.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${deleted.count} legacy unlinked machine records.`);
  }

  const remaining = await prisma.machineAsset.count();
  console.log(`Remaining pristine real machines with images: ${remaining}`);
}

main().then(() => prisma.$disconnect()).catch(console.error);
