const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking customer records...");
  let customer = await prisma.customer.findFirst({
    where: { name: { contains: "Sabari" } }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: "Sabari Roofing Solutions",
        companyName: "Sabari Textiles & Roofing",
        email: "accounts@sabaritex.com",
        phone: "+91 98427 12345",
        gstin: "33AABCS1429B1Z",
        billingAddress: "42 Brough Road, Erode, Tamil Nadu 638001",
        shippingAddress: "SIPCOT Industrial Complex, Perundurai, Erode",
        city: "Erode",
        state: "Tamil Nadu",
        stateCode: "33",
        creditLimit: 500000,
        creditPeriodDays: 30,
        status: "ACTIVE",
      }
    });
    console.log("Created customer:", customer.name);
  } else {
    console.log("Found customer:", customer.name, customer.id);
  }

  // Ensure both invoices #33 and #34 are active and not archived
  const inv33 = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: "0033" } }
  });
  if (inv33) {
    await prisma.invoice.update({
      where: { id: inv33.id },
      data: { isArchived: false, status: "UNPAID", balanceDue: 33399 }
    });
    console.log("Updated Invoice #33 to active UNPAID balance: ₹33,399.00");
  }

  const inv34 = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: "0034" } }
  });
  if (inv34) {
    await prisma.invoice.update({
      where: { id: inv34.id },
      data: { isArchived: false, balanceDue: 17705 }
    });
    console.log("Updated Invoice #34 to active balance: ₹17,705.00");
  }

  // Seed standard active projects if none exist
  const existingProjects = await prisma.project.count();
  console.log("Existing projects count:", existingProjects);

  const projectsToSeed = [
    {
      code: "SR-PRJ-2601",
      name: "Erode SIPCOT Heavy Industrial PEB Shed",
      customerId: customer.id,
      siteLocation: "SIPCOT Industrial Complex Phase-II",
      city: "Perundurai, Erode",
      state: "Tamil Nadu",
      stateCode: "33",
      roofType: "PEB",
      totalSqFt: 35000,
      contractValue: 1850000,
      status: "IN_PROGRESS",
      description: "Complete heavy industrial PEB roofing structure with purlins, colour coated Galvalume sheets, and ridge vents.",
    },
    {
      code: "SR-PRJ-2602",
      name: "Namakkal Cold Storage Sheeting & Polyurethane Insulation",
      customerId: customer.id,
      siteLocation: "Tiruchengode Main Road",
      city: "Namakkal",
      state: "Tamil Nadu",
      stateCode: "33",
      roofType: "PEB",
      totalSqFt: 18000,
      contractValue: 920000,
      status: "IN_PROGRESS",
      description: "PIR sandwich panels, weather-proof silicone sealing, and heavy gutter drainage systems.",
    },
    {
      code: "SR-PRJ-2603",
      name: "Tirupur Spinning Mill Weatherproof High-Span Roofing",
      customerId: customer.id,
      siteLocation: "Avinashi Road Industrial Area",
      city: "Tirupur",
      state: "Tamil Nadu",
      stateCode: "33",
      roofType: "PEB",
      totalSqFt: 42000,
      contractValue: 2450000,
      status: "PLANNING",
      description: "Curved standing seam profile roofing with polycarbonate daylight sheets and turbo ventilators.",
    },
    {
      code: "SR-PRJ-2604",
      name: "Ravichandran Chennai Commercial Warehouse Shed",
      customerId: customer.id,
      siteLocation: "Ambattur Industrial Estate",
      city: "Chennai",
      state: "Tamil Nadu",
      stateCode: "33",
      roofType: "PEB",
      totalSqFt: 22000,
      contractValue: 1480000,
      status: "IN_PROGRESS",
      description: "High tensile steel truss erection, sheet laying, and lightning arrestor earthing.",
    },
  ];

  for (const p of projectsToSeed) {
    const existing = await prisma.project.findUnique({ where: { code: p.code } });
    if (!existing) {
      await prisma.project.create({ data: p });
      console.log("Seeded Project:", p.code, p.name);
    } else {
      console.log("Project already exists:", p.code);
    }
  }

  console.log("Seed verification complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding dashboard data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
