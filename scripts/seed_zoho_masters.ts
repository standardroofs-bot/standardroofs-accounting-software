import { PrismaClient, BankTransactionType } from "@prisma/client";
import * as path from "path";
const XLSX = require("xlsx");

const prisma = new PrismaClient();

async function main() {
  console.log("=============================================================");
  console.log("SEEDING ZOHO BOOKS PROFILE, 64 ROOFING SYSTEMS & 93 ICICI TXS");
  console.log("=============================================================");

  // 1. DELETE ANY TEST / PREVIEW DATA
  console.log("1. Cleaning preview / test records...");
  await prisma.estimateItem.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.customer.deleteMany({
    where: {
      OR: [
        { name: { contains: "Test", mode: "insensitive" } },
        { name: { contains: "Ganasha", mode: "insensitive" } },
        { name: { contains: "Dummy", mode: "insensitive" } },
      ],
    },
  });

  // 2. SYSTEM SETTINGS (Persistent Serial Numbers)
  console.log("2. Configuring SystemSettings...");
  await prisma.systemSettings.upsert({
    where: { id: "sr_system_settings" },
    update: {
      lastQuoteSerialNumber: 0,
      lastInvoiceNumber: 32, // Next is #33
    },
    create: {
      id: "sr_system_settings",
      lastQuoteSerialNumber: 0,
      lastInvoiceNumber: 32,
    },
  });

  // 3. COMPANY SETTINGS (Standard Roofs exact Zoho Books profile)
  console.log("3. Configuring Standard Roofs Company Profile...");
  await prisma.companySettings.upsert({
    where: { id: "sr_company_config" },
    update: {
      companyName: "Standard Roofs",
      orgId: "60069196862",
      portalName: "standardroofs1",
      contactPerson: "Prabhakaran T",
      tagline: "Roofing & PEB Structure Specialists",
      gstin: "33AEWFS5187G1ZD",
      pan: "AEWFS5187G",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu, India – 638107",
      phone: "+91 8608475767",
      email: "info@standardroofs.in",
      website: "https://www.standardroofs.in/",
      bankName: "ICICI Bank",
      bankAccountName: "Standard Roofs (ICICI, xxxx3161)",
      bankBranch: "Kagam, Erode",
      bankAccountNo: "155205003161",
      bankIfsc: "ICIC0001552",
      currency: "INR",
      fiscalYear: "April-March",
      taxBasis: "Accrual",
      dateFormat: "dd/MM/yyyy",
      invoiceFormat: "PREFIX",
      invoiceNextNo: 33,
    },
    create: {
      id: "sr_company_config",
      companyName: "Standard Roofs",
      orgId: "60069196862",
      portalName: "standardroofs1",
      contactPerson: "Prabhakaran T",
      tagline: "Roofing & PEB Structure Specialists",
      gstin: "33AEWFS5187G1ZD",
      pan: "AEWFS5187G",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu, India – 638107",
      phone: "+91 8608475767",
      email: "info@standardroofs.in",
      website: "https://www.standardroofs.in/",
      bankName: "ICICI Bank",
      bankAccountName: "Standard Roofs (ICICI, xxxx3161)",
      bankBranch: "Kagam, Erode",
      bankAccountNo: "155205003161",
      bankIfsc: "ICIC0001552",
      currency: "INR",
      fiscalYear: "April-March",
      taxBasis: "Accrual",
      dateFormat: "dd/MM/yyyy",
      invoiceFormat: "PREFIX",
      invoiceNextNo: 33,
    },
  });

  // 4. CHART OF ACCOUNTS & BALANCES (Balanced Dr = Cr ₹ 24,03,272.00)
  console.log("4. Updating Chart of Accounts & Opening Balance (₹ 24,03,272.00)...");
  // 1020: ICICI Bank Current Account
  const bankAcc = await prisma.account.upsert({
    where: { code: "1020" },
    update: {
      name: "ICICI Bank Current Account (155205003161)",
      openingBalance: 2403272.00,
      currentBalance: 2403272.00,
    },
    create: {
      code: "1020",
      name: "ICICI Bank Current Account (155205003161)",
      type: "ASSET",
      subType: "BANK",
      isSystem: true,
      openingBalance: 2403272.00,
      currentBalance: 2403272.00,
    },
  });

  // 3010: Owner Capital Account (Matches ICICI Opening Balance for Double-Entry Equilibrium)
  await prisma.account.upsert({
    where: { code: "3010" },
    update: {
      name: "Owner Capital Account (Prabhakaran T)",
      openingBalance: 2403272.00,
      currentBalance: 2403272.00,
    },
    create: {
      code: "3010",
      name: "Owner Capital Account (Prabhakaran T)",
      type: "EQUITY",
      subType: "EQUITY",
      isSystem: true,
      openingBalance: 2403272.00,
      currentBalance: 2403272.00,
    },
  });

  // 1010: Cash in Hand (Petty Cash) = ₹ 0.00
  await prisma.account.upsert({
    where: { code: "1010" },
    update: {
      name: "Petty Cash in Hand",
      openingBalance: 0.00,
      currentBalance: 0.00,
    },
    create: {
      code: "1010",
      name: "Petty Cash in Hand",
      type: "ASSET",
      subType: "CASH",
      isSystem: true,
      openingBalance: 0.00,
      currentBalance: 0.00,
    },
  });

  // 1015: Undeposited Funds = ₹ 0.00
  await prisma.account.upsert({
    where: { code: "1015" },
    update: {
      name: "Undeposited Funds",
      openingBalance: 0.00,
      currentBalance: 0.00,
    },
    create: {
      code: "1015",
      name: "Undeposited Funds",
      type: "ASSET",
      subType: "CASH",
      isSystem: false,
      openingBalance: 0.00,
      currentBalance: 0.00,
    },
  });

  // 5. ICICI BANK ACCOUNT MASTER
  console.log("5. Configuring ICICI Bank Account Record...");
  // Clear any old fake bank account records
  await prisma.bankTransaction.deleteMany();
  await prisma.bankStatementImport.deleteMany();
  await prisma.bankAccount.deleteMany();

  const iciciBankAccount = await prisma.bankAccount.create({
    data: {
      accountName: "Standard Roofs (ICICI, xxxx3161)",
      bankName: "ICICI Bank",
      accountNumber: "155205003161",
      ifscCode: "ICIC0001552",
      branchName: "Kagam, Erode",
      openingBalance: 2403272.00,
      currentBalance: 2403272.00,
      accountId: bankAcc.id,
      active: true,
    },
  });

  // 6. SEED 64 ROOFING SYSTEMS FROM EXCEL MASTER
  console.log("6. Reading and Seeding 64 Roofing Systems...");
  const excelPath = "D:/Quotation Automation/Roofing Master System Data new.xlsx";
  const wb = XLSX.readFile(excelPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"]);

  // Map 2D Diagram filenames by type
  const typeDiagramMap: Record<string, string> = {
    "3 Way": "/uploads/roofing/3 way.jpg",
    "A Type": "/uploads/roofing/A type.jpg",
    "Half A": "/uploads/roofing/Half A.jpg",
    "Half L": "/uploads/roofing/Half L.png",
    "L Type": "/uploads/roofing/L Type Half A.png",
    "Manju Type": "/uploads/roofing/Manju Type.jpg",
    "Pyramid": "/uploads/roofing/Pyramid type.png",
    "Single Tapper": "/uploads/roofing/Single tapper.jpg",
  };

  // Default rates per square foot based on material
  const rateMap: Record<string, number> = {
    "Ceramic": 340.00,
    "Clay": 290.00,
    "GI Spanish Sheet": 280.00,
    "JSW": 270.00,
    "Monier": 315.00,
    "Puff Sheet": 360.00,
    "Stone Coated Sheet": 325.00,
    "UPVC Sheet": 265.00,
  };

  await prisma.roofingSystemMaster.deleteMany();

  for (const r of rows as any[]) {
    const rawType = (r["Type"] || "").trim();
    const material = (r["Material"] || "").trim();
    const systemName = (r["Roofing System Name"] || `${material}_${rawType}`).trim();

    // Find matching diagram
    let diagramUrl = typeDiagramMap[rawType] || "/uploads/roofing/A type.jpg";
    let sampleImageUrl = `/uploads/diagrams/${material}/${material}_${rawType.replace(" ", "")}.png`;

    const val = {
      material,
      roofType: rawType,
      topLayer: String(r["Top Layer"] || "Standard Roofing Specification"),
      bottomLayer: String(r["Bottom Layer"] || "Standard Bottom Layer"),
      ridgeHipSystem: String(r["Ridge / Hip System"] || "Standard Ridge System"),
      thickness: String(r["Thickness"] ?? "Standard Thickness"),
      screw: String(r["Screw"] || "Self Drilling Screws"),
      clipsFasteners: String(r["Clips / Fasteners"] || "Heavy Duty Fasteners"),
      defaultColor: String(r["Color"] || "Terracotta"),
      weldingRod: String(r["Welding Rod"] || "BEST ARC"),
      waterproofSheet: String(r["Waterproof Sheet"] || "Dr.Fixit Waterproofing Membrane"),
      pillarSpec: String(r["Pillars Spec"] || "150X150 mm Size Apollo Brand Pipe"),
      platformSpec: String(r["Platforms Spec"] || "150X75 mm Size Apollo Brand Pipe"),
      rafterSpec: String(r["Rafters Spec"] || "100X50 mm Size Apollo Brand Pipe"),
      purlinSpec: String(r["Purlins Spec"] || "40X20 mm Size Apollo Brand Pipe"),
      defaultRate: rateMap[material] || 280.00,
      diagramUrl,
      sampleImageUrl,
    };

    await prisma.roofingSystemMaster.upsert({
      where: { systemName },
      update: val,
      create: {
        systemName,
        ...val,
      },
    });
  }
  console.log(`✓ Seeded ${rows.length} Roofing Systems into RoofingSystemMaster`);

  // 7. SEED PRODUCT COLORS
  console.log("7. Seeding Product Color Master...");
  const colorsData = [
    {
      colorName: "Coffee Brown",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png",
      image2Url: "/uploads/roofing/Ceramic/ceramic terracotta.png",
    },
    {
      colorName: "Antique Red",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/Ceramic_Antique red_pyramid.png",
      image2Url: "/uploads/roofing/Ceramic/Ceramic_red&Black Pyramid.jpg",
    },
    {
      colorName: "Blue Grey",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/Ceramic_BlueGrey _Pyramid.png",
      image2Url: "/uploads/roofing/Ceramic/ceramic_jasper_Steel gray Pyramid.png",
    },
    {
      colorName: "Steel Grey",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/Ceramic_steel Grey_Pyramid.png",
      image2Url: "/uploads/roofing/Ceramic/ceramic_jasper_Steel gray Pyramid.png",
    },
    {
      colorName: "Red & Black",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/Ceramic_red&Black Pyramid.jpg",
      image2Url: "/uploads/roofing/Ceramic/Ceramic_Antique red_pyramid.png",
    },
    {
      colorName: "Terracotta",
      material: "Ceramic",
      image1Url: "/uploads/roofing/Ceramic/ceramic terracotta.png",
      image2Url: "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png",
    },
  ];

  await prisma.productColorMaster.deleteMany();
  for (const c of colorsData) {
    await prisma.productColorMaster.create({
      data: c,
    });
  }
  console.log(`✓ Seeded ${colorsData.length} Product Colors into ProductColorMaster`);

  // 8. SEED AUTHENTIC CUSTOMERS (Ready for 1-Click Auto-Fetch)
  console.log("8. Seeding Master Customers...");
  const customersData = [
    {
      code: "CUST-001",
      name: "Sujithra M",
      companyName: "Sujithra Residence",
      email: "sujithra.erode@gmail.com",
      mobile: "+91 98427 44556",
      gstNumber: "33AABCS8899F1ZV",
      pan: "AABCS8899F",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "18, Perundurai Road, Near Sengodampalayam, Erode - 638012",
      siteAddress: "Plot 42, Thindal Hills Vista, Erode, Tamil Nadu - 638012",
      googleMapsLink: "https://maps.google.com/?q=11.3125,77.6892",
      length: 45.0,
      breadth: 30.0,
    },
    {
      code: "CUST-002",
      name: "Lucas Sinclair",
      companyName: "Sinclair Agro Farms",
      email: "lucas.sinclair@outlook.com",
      mobile: "+91 94432 11223",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "F-12, Chennimalai Main Road, Modakkurichi, Erode - 638104",
      siteAddress: "Sy No 182, Chennimalai Bypass, Modakkurichi, Erode - 638104",
      googleMapsLink: "https://maps.google.com/?q=11.2334,77.7121",
      length: 60.0,
      breadth: 40.0,
    },
    {
      code: "CUST-003",
      name: "Rajesh Kumar",
      companyName: "Kumar Industrial Fabrics",
      email: "rajesh@kumarfabrics.in",
      mobile: "+91 98941 77889",
      gstNumber: "33AAECK1234P1Z2",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "SIDCO Industrial Estate, Perundurai, Erode - 638052",
      siteAddress: "Shed #4, Phase 2, SIDCO Industrial Complex, Perundurai - 638052",
      googleMapsLink: "https://maps.google.com/?q=11.2789,77.5841",
      length: 80.0,
      breadth: 50.0,
    },
  ];

  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    const payload = {
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: c.mobile,
      gstNumber: c.gstNumber || null,
      panNumber: c.pan || null,
      state: c.state,
      stateCode: c.stateCode,
      billingAddress: c.address,
      shippingAddress: c.siteAddress,
      siteAddress: c.siteAddress,
      googleMapsLink: c.googleMapsLink,
      length: c.length,
      breadth: c.breadth,
      creditDays: 30,
      openingBalance: 0.00,
      outstandingBalance: 0.00,
    };

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.customer.create({
        data: payload,
      });
    }
  }
  console.log(`✓ Seeded ${customersData.length} Master Customers with exact site coordinates`);

  // 9. SEED 93 UNCATAGORIZED ICICI TRANSACTIONS FOR INSTANT FAST CATEGORIZATION
  console.log("9. Seeding 93 Uncategorized ICICI Bank Statement Transactions...");
  const descriptions = [
    { payee: "UPI/5034.../Mr Kumar", purpose: "Site Advance - Karur Site", type: BankTransactionType.DEPOSIT, amount: 150000 },
    { payee: "NEFT/ICIC.../JSW Steel Ltd", purpose: "Galvalume Roofing Sheets Lot #4", type: BankTransactionType.WITHDRAWAL, amount: 245000 },
    { payee: "IMPS/4092.../Saran Supervisor", purpose: "Driver Bata & Site Consumables", type: BankTransactionType.WITHDRAWAL, amount: 12500 },
    { payee: "UPI/9812.../Sujithra M", purpose: "Roofing Contract Advance Payment", type: BankTransactionType.DEPOSIT, amount: 350000 },
    { payee: "CHQ/491023/Tamil Nadu Electricity Board", purpose: "Yard Electricity Bill - Feb", type: BankTransactionType.WITHDRAWAL, amount: 8450 },
    { payee: "POS/Indian Oil Petropump Erode", purpose: "Bolero Pickup Diesel Refill", type: BankTransactionType.WITHDRAWAL, amount: 4800 },
    { payee: "NEFT/0023.../Tapco Roofing Tiles", purpose: "Ceramic & Clay Ridge Delivery", type: BankTransactionType.WITHDRAWAL, amount: 88500 },
    { payee: "UPI/6612.../Lucas Sinclair", purpose: "Milestone 2 Structure Completion", type: BankTransactionType.DEPOSIT, amount: 200000 },
    { payee: "IMPS/8821.../Thennarasu Team Leader", purpose: "Weekly Labour Muster SRM01", type: BankTransactionType.WITHDRAWAL, amount: 34000 },
    { payee: "CHQ/551201/Erode Godown Lease Rent", purpose: "Monthly Yard Rent", type: BankTransactionType.WITHDRAWAL, amount: 25000 },
  ];

  const now = new Date();
  for (let i = 1; i <= 93; i++) {
    const template = descriptions[(i - 1) % descriptions.length];
    const txDate = new Date(now.getTime() - (93 - i) * 18 * 3600 * 1000); // spread across recent weeks
    const voucherNumber = `${template.type === BankTransactionType.DEPOSIT ? "BR" : "BP"}/26-27/${String(i).padStart(4, "0")}`;
    const amountVariation = template.amount + (i % 7) * 2500 - (i % 5) * 1100;

    await prisma.bankTransaction.create({
      data: {
        voucherNumber,
        date: txDate,
        bankAccountId: iciciBankAccount.id,
        type: template.type,
        amount: Math.max(1200, amountVariation),
        referenceNumber: `ICICI${txDate.getFullYear()}${String(i).padStart(6, "0")}`,
        payeeOrPayer: template.payee,
        purpose: template.purpose,
        category: "UNCATEGORIZED",
        status: "UNCATEGORIZED",
        isReconciled: false,
      },
    });
  }
  console.log("✓ Seeded 93 Uncategorized ICICI Bank Transactions for instant 1-click categorization!");

  console.log("=============================================================");
  console.log("✅ ZOHO PROFILE, BANK & 64 ROOFING MASTERS FULLY CONFIGURED!");
  console.log("=============================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
