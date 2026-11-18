import { PrismaClient, UserRole, AccountType, AccountSubType, MachineGroup, MachineStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDefaultPermissionsForRole } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("===============================================================");
  console.log("🌱 SR-BOOKS PRODUCTION CLEAN-SLATE RESET & SRM EXCEL SYNC");
  console.log("===============================================================");

  // 0. CLEAN SLATE PURGE (Remove all dummy transactions, sample fleet & materials)
  await prisma.estimateItem.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchaseBill.deleteMany();
  await prisma.expenseClaim.deleteMany();
  await prisma.contractorMilestone.deleteMany();
  await prisma.cashBookEntry.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.customerAdvance.deleteMany();
  await prisma.supplierAdvance.deleteMany();
  await prisma.creditDebitNote.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.vehicleTripLog.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.cargoVehicle.deleteMany();
  await prisma.materialStockMovement.deleteMany();
  await prisma.materialItem.deleteMany();
  await prisma.roofingPriceItem.deleteMany();
  await prisma.machineServiceRepair.deleteMany();
  await prisma.siteMaterialIssue.deleteMany();
  await prisma.machineMovement.deleteMany();
  await prisma.machineAllocation.deleteMany();
  await prisma.machineAsset.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  console.log("✓ Purged all sample transactions, fleet, materials, and vouchers");

  // 1. FINANCIAL YEAR (2026-27 Active)
  const fy2627 = await prisma.financialYear.upsert({
    where: { name: "2026-27" },
    update: { isCurrent: true, isLocked: false, isClosed: false },
    create: {
      name: "2026-27",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T23:59:59.999Z"),
      isCurrent: true,
      isLocked: false,
      isClosed: false,
    },
  });
  console.log(`✓ Active Financial Year: ${fy2627.name}`);

  // 2. VOUCHER SEQUENCES (Next Invoice starting cleanly at #33 / SR/26-27/0033)
  const sequences = [
    { voucherType: "INVOICE", prefix: "SR/26-27/", nextNumber: 33, paddingLength: 4 },
    { voucherType: "CASH_RECEIPT", prefix: "CR/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "CASH_PAYMENT", prefix: "CP/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "BANK_RECEIPT", prefix: "BR/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "BANK_PAYMENT", prefix: "BP/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "CONTRA", prefix: "CN/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "JOURNAL_VOUCHER", prefix: "JV/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "PURCHASE_BILL", prefix: "PB/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "EXPENSE", prefix: "EXP/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "ESTIMATE", prefix: "EST/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "CAPITAL_TRANSACTION", prefix: "CAP/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "LOAN_EMI", prefix: "EMI/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "CREDIT_NOTE", prefix: "CNOTE/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "DEBIT_NOTE", prefix: "DNOTE/26-27/", nextNumber: 1, paddingLength: 4 },
    { voucherType: "ADVANCE_PAYMENT", prefix: "ADV/26-27/", nextNumber: 1, paddingLength: 4 },
  ];

  for (const seq of sequences) {
    await prisma.voucherSequence.upsert({
      where: {
        financialYearId_voucherType: {
          financialYearId: fy2627.id,
          voucherType: seq.voucherType,
        },
      },
      update: {
        prefix: seq.prefix,
        nextNumber: seq.nextNumber,
        paddingLength: seq.paddingLength,
      },
      create: {
        financialYearId: fy2627.id,
        voucherType: seq.voucherType,
        prefix: seq.prefix,
        nextNumber: seq.nextNumber,
        paddingLength: seq.paddingLength,
      },
    });
  }
  console.log("✓ Voucher sequences initialized (Invoice sequence set to #33)");

  // 3. SYSTEM USERS & GRANULAR PERMISSIONS
  const userSeeds = [
    {
      name: "System Super Administrator",
      email: "admin@standardroofs.com",
      password: "Admin@2026",
      role: UserRole.SUPER_ADMIN,
      phone: "+91 98427 00000",
      permissions: getDefaultPermissionsForRole(UserRole.SUPER_ADMIN),
    },
    {
      name: "Managing Director",
      email: "md@standardroofs.com",
      password: "MD@2026",
      role: UserRole.MANAGING_DIRECTOR,
      phone: "+91 98427 00001",
      permissions: getDefaultPermissionsForRole(UserRole.MANAGING_DIRECTOR),
    },
    {
      name: "Senior Accountant",
      email: "accountant@standardroofs.com",
      password: "Accounts@2026",
      role: UserRole.ACCOUNTANT,
      phone: "+91 98427 00002",
      permissions: getDefaultPermissionsForRole(UserRole.ACCOUNTANT),
    },
    {
      name: "HR & Labour Manager",
      email: "hr@standardroofs.com",
      password: "Labour@2026",
      role: UserRole.HR_MANAGER,
      phone: "+91 98427 00004",
      permissions: getDefaultPermissionsForRole(UserRole.HR_MANAGER),
    },
    {
      name: "Site Supervisor",
      email: "supervisor@standardroofs.com",
      password: "Site@2026",
      role: UserRole.SITE_SUPERVISOR,
      phone: "+91 98427 00005",
      permissions: getDefaultPermissionsForRole(UserRole.SITE_SUPERVISOR),
    },
    // Backwards-compatible email aliases
    {
      name: "Managing Director (Admin)",
      email: "admin@standardroofs.in",
      password: "Admin@2026",
      role: UserRole.MANAGING_DIRECTOR,
      phone: "+91 98427 00001",
      permissions: getDefaultPermissionsForRole(UserRole.MANAGING_DIRECTOR),
    },
    {
      name: "Senior Accountant (IN)",
      email: "accounts@standardroofs.in",
      password: "Accounts@2026",
      role: UserRole.ACCOUNTANT,
      phone: "+91 98427 00002",
      permissions: getDefaultPermissionsForRole(UserRole.ACCOUNTANT),
    },
  ];

  for (const u of userSeeds) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        permissions: u.permissions as any,
        active: true,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        phone: u.phone,
        permissions: u.permissions as any,
        active: true,
      },
    });
  }
  console.log("✓ Super Admin, MD, Accountant, HR Manager and Site Supervisor accounts ready");

  // 4. CHART OF ACCOUNTS — ALL BALANCES STRICTLY AT ₹ 0.00
  const accountsData = [
    // ASSETS
    { code: "1010", name: "Cash in Hand", type: AccountType.ASSET, subType: AccountSubType.CASH, isSystem: true },
    { code: "1020", name: "HDFC Current Account (Main)", type: AccountType.ASSET, subType: AccountSubType.BANK, isSystem: true },
    { code: "1025", name: "ICICI Bank CC / OD Account", type: AccountType.ASSET, subType: AccountSubType.BANK, isSystem: true },
    { code: "1030", name: "Accounts Receivable (Debtors)", type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: true },
    { code: "1040", name: "Prepaid Site Expenses & Advances", type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: false },
    { code: "1050", name: "Labour Advance Control A/c", type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: false },
    { code: "1060", name: "CGST Input Tax Credit (ITC)", type: AccountType.ASSET, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "1061", name: "SGST Input Tax Credit (ITC)", type: AccountType.ASSET, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "1062", name: "IGST Input Tax Credit (ITC)", type: AccountType.ASSET, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "1070", name: "TDS Receivable (Section 194C)", type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: false },
    { code: "1510", name: "Plant, Machinery & Tools", type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET, isSystem: true },
    { code: "1520", name: "Commercial Site Vehicles", type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET, isSystem: true },

    // LIABILITIES
    { code: "2010", name: "Accounts Payable (Creditors/Suppliers)", type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: true },
    { code: "2020", name: "Contractor Withholding / Retention", type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: false },
    { code: "2030", name: "CGST Output Liability A/c", type: AccountType.LIABILITY, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "2031", name: "SGST Output Liability A/c", type: AccountType.LIABILITY, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "2032", name: "IGST Output Liability A/c", type: AccountType.LIABILITY, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: true },
    { code: "2040", name: "TDS Payable to Govt (Sec 194C)", type: AccountType.LIABILITY, subType: AccountSubType.DUTIES_AND_TAXES, isSystem: false },
    { code: "2050", name: "Wages & Labour Payable", type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: false },
    { code: "2510", name: "HDFC Equipment Loan A/c", type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: false },
    { code: "2520", name: "Commercial Vehicle Loan A/c", type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: false },

    // EQUITY
    { code: "3010", name: "Owner Capital Account", type: AccountType.EQUITY, subType: AccountSubType.EQUITY, isSystem: true },
    { code: "3020", name: "Retained Earnings / Surplus", type: AccountType.EQUITY, subType: AccountSubType.EQUITY, isSystem: true },
    { code: "3030", name: "Partner Current Account", type: AccountType.EQUITY, subType: AccountSubType.EQUITY, isSystem: false },

    // INCOME
    { code: "4010", name: "Roofing Contracts Revenue (TN GST 18%)", type: AccountType.INCOME, subType: AccountSubType.DIRECT_INCOME, isSystem: true },
    { code: "4020", name: "PEB Fabrication & Erection Services", type: AccountType.INCOME, subType: AccountSubType.DIRECT_INCOME, isSystem: true },
    { code: "4030", name: "Scrap & Residual Material Sales", type: AccountType.INCOME, subType: AccountSubType.INDIRECT_INCOME, isSystem: false },

    // EXPENSES
    { code: "5010", name: "Raw Material Purchases (Steel/Sheets/Tiles)", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: true },
    { code: "5020", name: "Freight, Transport & Crane Hiring Charges", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: true },
    { code: "5030", name: "Labour & Workmanship Charges", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: true },
    { code: "5040", name: "Sub-Contractor Payments (PEB/Civil)", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: true },
    { code: "5050", name: "Consumables, Welding Rods & Fasteners", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: false },
    { code: "5060", name: "Site Equipment Hire & Power Charges", type: AccountType.EXPENSE, subType: AccountSubType.DIRECT_EXPENSE, isSystem: false },
    { code: "6010", name: "Office Staff Salaries & Allowances", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6020", name: "Erode Yard & Office Rent", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6030", name: "Electricity & Yard Power Bills", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6040", name: "Printing, Stationery & Site Signboards", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6050", name: "Vehicle Fuel, Toll & Driver Bata", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6060", name: "Machinery Repairs & Consumables Maintenance", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6070", name: "Loan Interest & Bank Finance Charges", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
    { code: "6080", name: "Tea, Refreshments & Site Daily Expenses", type: AccountType.EXPENSE, subType: AccountSubType.INDIRECT_EXPENSE, isSystem: false },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        isSystem: acc.isSystem,
        openingBalance: 0.00,
        currentBalance: 0.00,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        isSystem: acc.isSystem,
        openingBalance: 0.00,
        currentBalance: 0.00,
      },
    });
  }
  console.log("✓ Chart of Accounts initialized (all 34 balances strictly ₹ 0.00)");

  // 5. BANK ACCOUNTS (Opening Balances = ₹ 0.00)
  const hdfcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1020" } });
  await prisma.bankAccount.upsert({
    where: { accountNumber: "50200012345678" },
    update: { openingBalance: 0.00, currentBalance: 0.00 },
    create: {
      accountName: "Standard Roofs Operating A/c",
      bankName: "HDFC Bank",
      branchName: "Erode Main Branch",
      accountNumber: "50200012345678",
      ifscCode: "HDFC0001234",
      openingBalance: 0.00,
      currentBalance: 0.00,
      accountId: hdfcAccount.id,
      active: true,
    },
  });

  const iciciAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1025" } });
  await prisma.bankAccount.upsert({
    where: { accountNumber: "001205009876" },
    update: { openingBalance: 0.00, currentBalance: 0.00 },
    create: {
      accountName: "Standard Roofs CC / OD Facility",
      bankName: "ICICI Bank",
      branchName: "Brough Road, Erode",
      accountNumber: "001205009876",
      ifscCode: "ICIC0000012",
      openingBalance: 0.00,
      currentBalance: 0.00,
      accountId: iciciAccount.id,
      active: true,
    },
  });
  console.log("✓ HDFC Current & ICICI CC/OD bank accounts initialized (balances strictly ₹ 0.00)");

  // 6. REAL MACHINES & TOOLS (Imported directly from 2026_SRMachines_Tracking_System.xlsx)
  const realMachinesData = [
    { sNo: 1, assetCode: "SRM-VEH-01", name: "Vehicle (Site Two-Wheelers / XL)", category: "Heavy Vehicles", srFinalCount: 13, totalCount: 16, officeCount: 9, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 0, srm05Count: 1, srm06Count: 0, spareCount: 1, serviceCount: 1, scrapCount: 1, notes: "Uthukuli one XL", status: MachineStatus.ALLOCATED, location: "Site Allocations" },
    { sNo: 2, assetCode: "SRM-WLD-01", name: "Welding Machine & Holder Set", category: "Power Tools", srFinalCount: 4, totalCount: 7, officeCount: 3, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 1, spareCount: 1, serviceCount: 0, scrapCount: 0, notes: "Gps / Tastt weld", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 3, assetCode: "SRM-CUT-01", name: "Small Cutting Machine (Ferm / Dewalt)", category: "Power Tools", srFinalCount: 2, totalCount: 3, officeCount: 0, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 1, spareCount: 1, serviceCount: 0, scrapCount: 0, notes: "Ferm mk / Dewalt with Cable", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 4, assetCode: "SRM-BRK-01", name: "Breaker Machine", category: "Power Tools", srFinalCount: 2, totalCount: 4, officeCount: 1, srm01Count: 1, srm02Count: 1, srm03Count: 0, srm04Count: 0, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Heavy Demolition", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 5, assetCode: "SRM-SCR-01", name: "Battery / Electrical Screwing Machine", category: "Power Tools", srFinalCount: 4, totalCount: 7, officeCount: 2, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 1, spareCount: 1, serviceCount: 0, scrapCount: 0, notes: "Dong Challenges / Golden Bullet / Tlttal", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 6, assetCode: "SRM-TST-01", name: "Electrical Tester", category: "Electrical & Measurement", srFinalCount: 6, totalCount: 6, officeCount: 1, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 7, assetCode: "SRM-LEV-01", name: "Level Tube (Water Level Roll)", category: "Measurement", srFinalCount: 4, totalCount: 4, officeCount: 2, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 1, spareCount: 1, serviceCount: 0, scrapCount: 0, notes: "50m Transparent", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 8, assetCode: "SRM-CLK-01", name: "Chalk Bit (Kalar bit)", category: "Bits & Consumables", srFinalCount: 14, totalCount: 14, officeCount: 0, srm01Count: 1, srm02Count: 2, srm03Count: 1, srm04Count: 2, srm05Count: 2, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 9, assetCode: "SRM-STR-01", name: "Star Bit (Magnetic)", category: "Bits & Consumables", srFinalCount: 4, totalCount: 4, officeCount: 0, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 10, assetCode: "SRM-BKB-01", name: "Breaker Bit (Pointed/Flat)", category: "Bits & Consumables", srFinalCount: 8, totalCount: 8, officeCount: 0, srm01Count: 2, srm02Count: 2, srm03Count: 0, srm04Count: 2, srm05Count: 2, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 11, assetCode: "SRM-DRB-01", name: "Breaker Drill Bit 14mm / 10mm / 12mm", category: "Bits & Consumables", srFinalCount: 8, totalCount: 8, officeCount: 0, srm01Count: 1, srm02Count: 10, srm03Count: 0, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "SDS Plus Drill Bits", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 12, assetCode: "SRM-SCL-01", name: "Moolaimatta Scale (Right Angle 90°)", category: "Measurement", srFinalCount: 4, totalCount: 10, officeCount: 6, srm01Count: 1, srm02Count: 1, srm03Count: 0, srm04Count: 0, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 13, assetCode: "SRM-LTM-01", name: "Level Tester Medium (Spirit Level)", category: "Measurement", srFinalCount: 5, totalCount: 5, officeCount: 1, srm01Count: 1, srm02Count: 1, srm03Count: 0, srm04Count: 0, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 14, assetCode: "SRM-CBL-01", name: "Black Oyar (Heavy Electrical Extension Wire)", category: "Electrical & Measurement", srFinalCount: 12, totalCount: 12, officeCount: 5, srm01Count: 1, srm02Count: 1, srm03Count: 0, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 15, assetCode: "SRM-BAG-01", name: "Leather Carrying Tool Bag", category: "Bags & Safety", srFinalCount: 7, totalCount: 7, officeCount: 3, srm01Count: 0, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 16, assetCode: "SRM-HAM-01", name: "Sutthi (Steel Hammer)", category: "Hand Tools", srFinalCount: 8, totalCount: 8, officeCount: 3, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 17, assetCode: "SRM-CHZ-01", name: "Vuli (Cold Chisel)", category: "Hand Tools", srFinalCount: 6, totalCount: 6, officeCount: 6, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 2, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 18, assetCode: "SRM-PLR-01", name: "Cutting Plier", category: "Hand Tools", srFinalCount: 5, totalCount: 5, officeCount: 5, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 19, assetCode: "SRM-WPL-01", name: "Wire Cutting Plier", category: "Hand Tools", srFinalCount: 7, totalCount: 7, officeCount: 2, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 20, assetCode: "SRM-SWB-01", name: "Switch Box (Industrial Extension)", category: "Electrical & Measurement", srFinalCount: 7, totalCount: 7, officeCount: 3, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 1, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 21, assetCode: "SRM-STP-01", name: "Small Tape (Measuring 3m / 5m)", category: "Measurement", srFinalCount: 5, totalCount: 5, officeCount: 4, srm01Count: 2, srm02Count: 1, srm03Count: 2, srm04Count: 2, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 22, assetCode: "SRM-BTP-01", name: "Big Tape (Measuring 30m / 50m)", category: "Measurement", srFinalCount: 5, totalCount: 5, officeCount: 3, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 23, assetCode: "SRM-PLM-01", name: "Mulamattam Thukku (Plumb Bob)", category: "Measurement", srFinalCount: 4, totalCount: 6, officeCount: 2, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 24, assetCode: "SRM-THD-01", name: "Thread (Nool Kandu Alignment String)", category: "Consumables", srFinalCount: 18, totalCount: 18, officeCount: 18, srm01Count: 2, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 25, assetCode: "SRM-WTP-01", name: "Wire Tape (Insulation Roll)", category: "Electrical & Measurement", srFinalCount: 10, totalCount: 10, officeCount: 5, srm01Count: 2, srm02Count: 2, srm03Count: 2, srm04Count: 2, srm05Count: 2, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 26, assetCode: "SRM-TRW-01", name: "Meson Karandi (Masonry Trowel)", category: "Hand Tools", srFinalCount: 12, totalCount: 12, officeCount: 0, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 27, assetCode: "SRM-SDR-01", name: "Screw Driver Set", category: "Hand Tools", srFinalCount: 10, totalCount: 10, officeCount: 6, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 28, assetCode: "SRM-HSW-01", name: "Hacksaw Blade & Frame", category: "Hand Tools", srFinalCount: 8, totalCount: 8, officeCount: 3, srm01Count: 1, srm02Count: 1, srm03Count: 1, srm04Count: 1, srm05Count: 1, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 29, assetCode: "SRM-NPL-01", name: "SR Name Plate (Branding Plates)", category: "Branding", srFinalCount: 10, totalCount: 10, officeCount: 4, srm01Count: 2, srm02Count: 2, srm03Count: 2, srm04Count: 2, srm05Count: 2, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Box packaging", status: MachineStatus.ALLOCATED, location: "Site Teams" },
    { sNo: 30, assetCode: "SRM-TSH-01", name: "Office T-shirt (Standard Roofs Staff)", category: "Uniform", srFinalCount: 2, totalCount: 2, officeCount: 2, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.AVAILABLE, location: "Office" },
    { sNo: 31, assetCode: "SRM-PNT-01", name: "Compression Painting Machine", category: "Power Tools", srFinalCount: 1, totalCount: 1, officeCount: 1, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Office Big godown - right side corner", status: MachineStatus.AVAILABLE, location: "Office Godown" },
    { sNo: 32, assetCode: "SRM-BLW-01", name: "Blower Electric Machine", category: "Power Tools", srFinalCount: 1, totalCount: 1, officeCount: 1, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Office", status: MachineStatus.AVAILABLE, location: "Office" },
    { sNo: 33, assetCode: "SRM-WSH-01", name: "Water Wash High-Pressure Machine", category: "Power Tools", srFinalCount: 1, totalCount: 1, officeCount: 1, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Labour cupboard", status: MachineStatus.AVAILABLE, location: "Office Cupboard" },
    { sNo: 34, assetCode: "SRM-BDR-01", name: "Big Drilling Machine", category: "Power Tools", srFinalCount: 1, totalCount: 1, officeCount: 1, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "Labour cupboard", status: MachineStatus.AVAILABLE, location: "Office Cupboard" },
    { sNo: 35, assetCode: "SRM-BCU-01", name: "Big Cutting Machine (Periya Cutting Machine)", category: "Power Tools", srFinalCount: 1, totalCount: 1, officeCount: 1, srm01Count: 0, srm02Count: 0, srm03Count: 0, srm04Count: 0, srm05Count: 0, srm06Count: 0, spareCount: 0, serviceCount: 0, scrapCount: 0, notes: "", status: MachineStatus.AVAILABLE, location: "Office Yard" },
  ];

  for (const m of realMachinesData) {
    const created = await prisma.machineAsset.create({
      data: {
        sNo: m.sNo,
        assetCode: m.assetCode,
        name: m.name,
        category: m.category,
        srFinalCount: m.srFinalCount,
        totalCount: m.totalCount,
        officeCount: m.officeCount,
        srm01Count: m.srm01Count,
        srm02Count: m.srm02Count,
        srm03Count: m.srm03Count,
        srm04Count: m.srm04Count,
        srm05Count: m.srm05Count,
        srm06Count: m.srm06Count,
        spareCount: m.spareCount,
        serviceCount: m.serviceCount,
        scrapCount: m.scrapCount,
        notes: m.notes,
        currentStatus: m.status,
        currentLocation: m.location,
      },
    });

    // Create allocation records for teams having this item
    const groupAllocations: { group: MachineGroup; count: number }[] = [
      { group: MachineGroup.SRM01, count: m.srm01Count },
      { group: MachineGroup.SRM02, count: m.srm02Count },
      { group: MachineGroup.SRM03, count: m.srm03Count },
      { group: MachineGroup.SRM04, count: m.srm04Count },
      { group: MachineGroup.SRM05, count: m.srm05Count },
      { group: MachineGroup.SRM06, count: m.srm06Count },
      { group: MachineGroup.OFFICE, count: m.officeCount },
      { group: MachineGroup.SPARE, count: m.spareCount },
      { group: MachineGroup.SERVICE, count: m.serviceCount },
      { group: MachineGroup.SCRAP, count: m.scrapCount },
    ];

    for (const alloc of groupAllocations) {
      if (alloc.count > 0) {
        await prisma.machineAllocation.create({
          data: {
            machineId: created.id,
            allocationGroup: alloc.group,
            allocatedDate: new Date(),
            status: "ACTIVE",
            notes: `Allocated count: ${alloc.count}`,
          },
        });
      }
    }
  }
  console.log(`✓ ${realMachinesData.length} Real SRM Machines & Equipment imported from 2026_SRMachines_Tracking_System.xlsx`);

  // 7. REAL SITE CONSUMABLES & MATERIAL ISSUE RECORDS (From sheet)
  const siteIssuesData = [
    { date: new Date("2026-01-22"), team: "SRM01", siteName: "Sakthi Team - Vasudevan Kumarapalayam", productName: "Welding Rods (Boxes)", quantity: 2, returnedQty: 0, isReturnable: false, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: new Date("2026-01-22"), team: "SRM01", siteName: "Sakthi Team - Vasudevan Kumarapalayam", productName: '5" Cutting Wheel', quantity: 25, returnedQty: 0, isReturnable: false, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: new Date("2026-01-24"), team: "SRM02", siteName: "Velu Team - Pravin Erode", productName: "Kerala Paint (Cans)", quantity: 5, returnedQty: 0, isReturnable: false, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: new Date("2026-01-24"), team: "SRM02", siteName: "Velu Team - Pravin Erode", productName: "U-Clamps", quantity: 12, returnedQty: 0, isReturnable: false, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: new Date("2026-01-25"), team: "SRM04", siteName: "Velu Team - Mani Karur", productName: '5" Cutting Wheel', quantity: 25, returnedQty: 0, isReturnable: false, issuedBy: "Siva Kumar", approvedBy: "Gowri Sankar", condition: "Good" },
    { date: new Date("2026-02-01"), team: "SRM06", siteName: "Gem Hospital Erode", productName: "Safety Belts & Harness", quantity: 4, returnedQty: 4, isReturnable: true, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: new Date("2026-02-01"), team: "SRM06", siteName: "Vellalar Edu. Trust", productName: "Level Tube (50m)", quantity: 1, returnedQty: 1, isReturnable: true, issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
  ];

  for (const issue of siteIssuesData) {
    await prisma.siteMaterialIssue.create({
      data: issue,
    });
  }
  console.log(`✓ ${siteIssuesData.length} Site Consumable & Material Issue records initialized from tracking sheet`);

  // 8. DEFAULT COMPANY SETTINGS
  await prisma.companySettings.upsert({
    where: { id: "sr_company_config" },
    update: { invoiceNextNo: 33 },
    create: {
      id: "sr_company_config",
      companyName: "Standard Roofs",
      tagline: "Roofing & PEB Structure Specialists",
      gstin: "33AABCS1234F1Z5",
      pan: "AABCS1234F",
      state: "Tamil Nadu",
      stateCode: "33",
      address: "12/4, Perundurai Road, Near Collectorate, Erode - 638011, Tamil Nadu",
      phone: "+91 98427 12345",
      email: "accounts@standardroofs.com",
      bankName: "HDFC Bank",
      bankBranch: "Erode Main Branch",
      bankAccountNo: "50200012345678",
      bankIfsc: "HDFC0001234",
      invoiceFormat: "PREFIX",
      invoiceNextNo: 33,
    },
  });
  console.log("✓ Standard Roofs Company Profile & GST Settings initialized");

  console.log("===============================================================");
  console.log("✅ RESET COMPLETE: 0 DUMMY DATA. REAL SRM EXCEL IMPORTED. BOOKS AT ₹ 0.00");
  console.log("===============================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
