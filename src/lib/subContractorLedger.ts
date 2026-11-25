import { PrismaClient } from "@prisma/client";

export function computeAmountToGive(
  entryType: string,
  sqft: number,
  ratePerSqft: number,
  otherAllowance: number,
  materialReduction: number
): number {
  if (entryType === "PAYMENT") return 0;
  return Math.round(((sqft * ratePerSqft) + otherAllowance - materialReduction) * 100) / 100;
}

export async function recalculateSubContractorLedger(
  subContractorId: string,
  prisma: PrismaClient
) {
  const team = await prisma.subContractor.findUnique({
    where: { id: subContractorId },
  });
  if (!team) throw new Error("SubContractor not found");

  const entries = await prisma.subContractorLedgerEntry.findMany({
    where: { subContractorId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let runningBalance = Math.round((team.openingBalance || 0) * 100) / 100;

  for (const entry of entries) {
    const amountToGive = computeAmountToGive(
      entry.entryType,
      entry.sqft,
      entry.ratePerSqft,
      entry.otherAllowance,
      entry.materialReduction
    );
    runningBalance = Math.round((runningBalance + amountToGive - (entry.givenAmount || 0)) * 100) / 100;

    if (entry.amountToGive !== amountToGive || entry.runningBalance !== runningBalance) {
      await prisma.subContractorLedgerEntry.update({
        where: { id: entry.id },
        data: { amountToGive, runningBalance },
      });
    }
  }

  return prisma.subContractor.update({
    where: { id: subContractorId },
    data: { currentBalance: runningBalance },
    include: {
      entries: {
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}
