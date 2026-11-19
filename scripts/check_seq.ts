import { prisma } from "../src/lib/prisma";

async function main() {
  const inv34 = await prisma.invoice.findFirst({
    where: { sequenceNumber: 34 },
    include: { items: true, customer: true },
  });
  console.log("Invoice 34:", {
    id: inv34?.id,
    customer: inv34?.customer?.name,
    subTotal: inv34?.subTotal,
    cgst: inv34?.cgstTotal,
    sgst: inv34?.sgstTotal,
    adj: inv34?.adjustment,
    total: inv34?.totalAmount,
    status: inv34?.status,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
