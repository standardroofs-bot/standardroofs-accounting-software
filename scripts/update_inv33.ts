import { prisma } from "../src/lib/prisma";

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { sequenceNumber: 33 },
  });
  if (inv) {
    const updated = await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        cgstTotal: "1350.38",
        sgstTotal: "1350.38",
        adjustment: "-0.01",
        totalAmount: "17705.00",
        balanceDue: "17705.00",
        status: "DRAFT", // Set to DRAFT so it shows the exact Draft ribbon from Image 2!
      },
    });
    console.log("Updated invoice 33 to exact Zoho values and status DRAFT:", updated);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
