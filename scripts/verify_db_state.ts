import { prisma } from "../src/lib/prisma";

async function main() {
  const ms = await prisma.machineAsset.findMany({
    select: { id: true, assetCode: true, name: true, sNo: true, imageUrl: true },
    orderBy: { assetCode: "asc" },
  });
  console.log(`Total machines: ${ms.length}`);
  console.log("Assets:", ms.map(m => `${m.assetCode}: ${m.name} [sNo=${m.sNo}] img=${m.imageUrl ? 'YES' : 'NO'}`));
}

main().then(() => prisma.$disconnect()).catch(console.error);
