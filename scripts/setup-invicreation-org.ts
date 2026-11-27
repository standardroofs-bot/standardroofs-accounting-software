import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getDefaultPermissionsForRole, getFullPermissions } from "../src/lib/auth";
import { recalculatePayrollRunTotals } from "../src/lib/payrollTotals";
import {
  STANDARD_ROOFS_COMPANY_ID,
  INVI_CREATION_COMPANY_ID,
} from "../src/lib/tenant";

const prisma = new PrismaClient();

async function ensureUserWithCompanyAccess(opts: {
  email: string;
  name: string;
  role: UserRole;
  defaultPassword?: string;
  companyIds: string[];
  defaultCompanyId: string;
  employeeId?: string | null;
  overwriteExistingRole?: boolean;
}) {
  const cleanEmail = opts.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  const perms =
    opts.role === UserRole.SUPER_ADMIN
      ? getFullPermissions()
      : getDefaultPermissionsForRole(opts.role);

  if (!user) {
    const pwd = opts.defaultPassword || "StandardRoofs@2026";
    const passwordHash = await bcrypt.hash(pwd, 10);
    user = await prisma.user.create({
      data: {
        name: opts.name,
        email: cleanEmail,
        passwordHash,
        role: opts.role,
        defaultCompanyId: opts.defaultCompanyId,
        employeeId: opts.employeeId || null,
        permissions: perms as any,
        active: true,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(opts.overwriteExistingRole ? { name: opts.name, role: opts.role, permissions: perms as any } : {}),
        defaultCompanyId: opts.defaultCompanyId,
        active: true,
      },
    });
  }

  // Enforce strict UserCompanyAccess list
  await prisma.userCompanyAccess.deleteMany({
    where: {
      userId: user.id,
      companyId: { notIn: opts.companyIds },
    },
  });

  for (const companyId of opts.companyIds) {
    await prisma.userCompanyAccess.upsert({
      where: {
        userId_companyId: { userId: user.id, companyId },
      },
      update: {
        role: opts.role,
        isDefault: companyId === opts.defaultCompanyId,
      },
      create: {
        userId: user.id,
        companyId,
        role: opts.role,
        isDefault: companyId === opts.defaultCompanyId,
      },
    });
  }

  return user;
}

async function main() {
  console.log("=== Standard Roofs & Invi Creation Multi-Tenant Isolation Setup ===");

  // 1. Upsert the two distinct organizations
  await prisma.company.upsert({
    where: { id: STANDARD_ROOFS_COMPANY_ID },
    update: {
      code: "STANDARD_ROOFS",
      name: "Standard Roofs",
      tagline: "Construction & Roofing • Erode",
      gstin: "33AEWFS5187G1ZD",
      location: "Erode",
      address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu - 638107",
      phone: "+91 8608475767",
      email: "info@standardroofs.in",
      website: "https://www.standardroofs.in/",
      logoUrl: "/logo.png",
      isActive: true,
    },
    create: {
      id: STANDARD_ROOFS_COMPANY_ID,
      code: "STANDARD_ROOFS",
      name: "Standard Roofs",
      tagline: "Construction & Roofing • Erode",
      gstin: "33AEWFS5187G1ZD",
      location: "Erode",
      address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu - 638107",
      phone: "+91 8608475767",
      email: "info@standardroofs.in",
      website: "https://www.standardroofs.in/",
      logoUrl: "/logo.png",
      isActive: true,
    },
  });

  await prisma.company.upsert({
    where: { id: INVI_CREATION_COMPANY_ID },
    update: {
      code: "INVI_CREATION",
      name: "Invi Creation",
      tagline: "Women's Ethnic Wear & Digital Hub • Erode",
      gstin: null,
      location: "Erode",
      address: "D144/A, Vellakkal Medu, Nasiyanur Post, Erode, Tamil Nadu - 638107",
      phone: "+91 8608475767",
      email: "admin@invicreation.com",
      logoUrl: "/logo.png",
      isActive: true,
    },
    create: {
      id: INVI_CREATION_COMPANY_ID,
      code: "INVI_CREATION",
      name: "Invi Creation",
      tagline: "Women's Ethnic Wear & Digital Hub • Erode",
      gstin: null,
      location: "Erode",
      address: "D144/A, Vellakkal Medu, Nasiyanur Post, Erode, Tamil Nadu - 638107",
      phone: "+91 8608475767",
      email: "admin@invicreation.com",
      logoUrl: "/logo.png",
      isActive: true,
    },
  });
  console.log("✓ Organizations verified: Standard Roofs & Invi Creation");

  // 2. Identify & migrate all Invi Creation employees
  const inviEmployees = await prisma.employeeOrLabour.findMany({
    where: {
      OR: [
        { employeeCode: { startsWith: "Invi", mode: "insensitive" } },
        { empCode: { startsWith: "Invi", mode: "insensitive" } },
        { companyUnit: { equals: "INVI_CREATION", mode: "insensitive" } },
        { companyUnit: { equals: "Invi Creation", mode: "insensitive" } },
      ],
    },
  });
  const inviEmpIds = inviEmployees.map((e) => e.id);
  const inviCodes = inviEmployees.map((e) => e.employeeCode);

  if (inviEmpIds.length > 0) {
    await prisma.employeeOrLabour.updateMany({
      where: { id: { in: inviEmpIds } },
      data: {
        companyId: INVI_CREATION_COMPANY_ID,
        companyUnit: "INVI_CREATION",
      },
    });
    await prisma.attendanceRecord.updateMany({
      where: { employeeId: { in: inviEmpIds } },
      data: {
        companyId: INVI_CREATION_COMPANY_ID,
        companyUnit: "INVI_CREATION",
      },
    });
    await prisma.leaveRequest.updateMany({
      where: { employeeId: { in: inviEmpIds } },
      data: { companyId: INVI_CREATION_COMPANY_ID },
    });

    // Migrate matching CashBook advance/salary entries for Invi personnel
    for (const emp of inviEmployees) {
      await prisma.cashBookEntry.updateMany({
        where: {
          OR: [
            { counterpartyName: { equals: emp.name, mode: "insensitive" } },
            { purpose: { contains: emp.employeeCode, mode: "insensitive" } },
          ],
        },
        data: { companyId: INVI_CREATION_COMPANY_ID },
      });
    }
  }
  console.log(`✓ Migrated ${inviEmpIds.length} Invi employees (${inviCodes.join(", ")}) + attendance + leaves to Invi Creation.`);

  // Ensure non-Invi records stay on Standard Roofs
  await prisma.employeeOrLabour.updateMany({
    where: { id: { notIn: inviEmpIds } },
    data: { companyId: STANDARD_ROOFS_COMPANY_ID },
  });
  await prisma.contractor.updateMany({
    data: { companyId: STANDARD_ROOFS_COMPANY_ID },
  });
  await prisma.contractorDailyLog.updateMany({
    data: { companyId: STANDARD_ROOFS_COMPANY_ID },
  });

  // 3. Migrate PayrollItems for Invi Creation into isolated Invi Creation PayrollRuns
  const inviPayrollItems = await prisma.payrollItem.findMany({
    where: {
      OR: [
        { employeeId: { in: inviEmpIds } },
        { employeeCode: { in: inviCodes } },
        { company: { equals: "INVI_CREATION", mode: "insensitive" } },
      ],
    },
    include: { payrollRun: true },
  });

  const touchedRunIds = new Set<string>();
  const runCache = new Map<string, string>();

  for (const item of inviPayrollItems) {
    const srcRun = item.payrollRun;
    if (srcRun.companyId === INVI_CREATION_COMPANY_ID) {
      if (item.company !== "INVI_CREATION") {
        await prisma.payrollItem.update({
          where: { id: item.id },
          data: { company: "INVI_CREATION" },
        });
      }
      touchedRunIds.add(srcRun.id);
      continue;
    }

    touchedRunIds.add(srcRun.id);
    const key = `${srcRun.cycleType}|${srcRun.month}|${srcRun.halfPeriod}|${srcRun.companyFilter}`;
    let targetRunId = runCache.get(key);

    if (!targetRunId) {
      const targetRun = await prisma.payrollRun.upsert({
        where: {
          cycleType_month_halfPeriod_companyFilter_companyId: {
            cycleType: srcRun.cycleType,
            month: srcRun.month,
            halfPeriod: srcRun.halfPeriod,
            companyFilter: "ALL",
            companyId: INVI_CREATION_COMPANY_ID,
          },
        },
        update: {
          status: srcRun.status,
          approvedBy: srcRun.approvedBy,
          approvedAt: srcRun.approvedAt,
        },
        create: {
          cycleType: srcRun.cycleType,
          month: srcRun.month,
          halfPeriod: srcRun.halfPeriod,
          companyFilter: "ALL",
          companyId: INVI_CREATION_COMPANY_ID,
          status: srcRun.status,
          approvedBy: srcRun.approvedBy,
          approvedAt: srcRun.approvedAt,
        },
      });
      targetRunId = targetRun.id;
      runCache.set(key, targetRunId);
    }

    await prisma.payrollItem.update({
      where: { id: item.id },
      data: {
        payrollRunId: targetRunId,
        company: "INVI_CREATION",
      },
    });
    touchedRunIds.add(targetRunId);
  }

  for (const runId of touchedRunIds) {
    await recalculatePayrollRunTotals(runId, prisma);
  }

  // Ensure Invi Creation also has clean 2026-10 (PAID) and 2026-11 (DRAFT) runs
  for (const ensureSpec of [
    { month: "2026-10", status: "PAID", workingDays: 26 },
    { month: "2026-11", status: "DRAFT", workingDays: 24 },
  ]) {
    const existingInviRun = await prisma.payrollRun.findUnique({
      where: {
        cycleType_month_halfPeriod_companyFilter_companyId: {
          cycleType: "MONTHLY_OFFICE",
          month: ensureSpec.month,
          halfPeriod: "FULL",
          companyFilter: "ALL",
          companyId: INVI_CREATION_COMPANY_ID,
        },
      },
      include: { items: true },
    });

    if (!existingInviRun && inviEmployees.length > 0) {
      const [y, m] = ensureSpec.month.split("-").map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
      const recs = await prisma.attendanceRecord.findMany({
        where: { employeeId: { in: inviEmpIds }, date: { gte: start, lte: end } },
      });

      const itemsData = inviEmployees.map((emp) => {
        const empRecs = recs.filter((r) => r.employeeId === emp.id);
        let payable = 0;
        if (empRecs.length > 0) {
          for (const r of empRecs) {
            const st = (r.status || "").toUpperCase();
            if (st === "P" || st === "1H" || st === "PL") payable += 1;
            else if (st === "H") payable += 0.5;
          }
        } else {
          payable = ensureSpec.workingDays;
        }
        const rate = Number(emp.monthlySalary || emp.baseWage || 0);
        const gross = rate <= 2500 ? Math.round(rate * payable) : Math.round((rate / ensureSpec.workingDays) * payable);
        const isPaidRun = ensureSpec.status === "PAID";
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employeeCode,
          category: "OFFICE",
          company: "INVI_CREATION",
          totalWorkingDays: ensureSpec.workingDays,
          daysPresent: payable,
          leaveDays: Math.max(0, ensureSpec.workingDays - payable),
          baseRate: rate,
          grossSalary: gross,
          otAndIncentive: 0,
          nightDutyAmount: 0,
          vehicleAllowance: 0,
          lastMonthBalance: 0,
          advanceDeduction: 0,
          expenseBalanceDeduction: 0,
          netSalary: gross,
          paidCash: 0,
          paidBankOrGpay: isPaidRun ? gross : 0,
          paidGpay: 0,
          paymentChannel: "ICICI",
          paymentStatus: isPaidRun ? "PAID" : "UNPAID",
          carryForwardBalance: isPaidRun ? 0 : gross,
          isCleared: isPaidRun,
          designation: emp.designation || emp.role || null,
          location: emp.location || "ERODE",
          state: emp.state || "TAMIL NADU",
          mobileNo: emp.phone || null,
          aadhaarNo: emp.aadhaarNumber || null,
          bankName: emp.bankName || null,
          accountNo: emp.bankAccountNo || emp.bankAccountNumber || null,
        };
      });

      const totalGross = itemsData.reduce((s, it) => s + it.grossSalary, 0);
      const totalNet = itemsData.reduce((s, it) => s + it.netSalary, 0);
      const paidBank = itemsData.reduce((s, it) => s + it.paidBankOrGpay, 0);
      await prisma.payrollRun.create({
        data: {
          cycleType: "MONTHLY_OFFICE",
          month: ensureSpec.month,
          halfPeriod: "FULL",
          companyFilter: "ALL",
          companyId: INVI_CREATION_COMPANY_ID,
          status: ensureSpec.status,
          totalGross,
          totalDeductions: 0,
          totalNet,
          paidCash: 0,
          paidBank,
          items: { create: itemsData },
        },
      });
    }
  }
  console.log(`✓ Migrated ${inviPayrollItems.length} payroll items into isolated Invi Creation payroll runs & verified 2026-10 / 2026-11 Invi runs.`);

  // 4. Provision & scope RBAC credentials + UserCompanyAccess
  const inviAdminPwd = process.env.INVI_ADMIN_PASSWORD || "InviAdmin@2026";
  const inviHrPwd = process.env.INVI_HR_PASSWORD || "InviHr@2026";
  const srHrPwd = process.env.SR_HR_PASSWORD || "SrHr@2026";

  // Group Super Admins (both Standard Roofs + Invi Creation)
  await ensureUserWithCompanyAccess({
    email: "admin@standardroofs.in",
    name: "Prabhakaran T",
    role: UserRole.SUPER_ADMIN,
    companyIds: [STANDARD_ROOFS_COMPANY_ID, INVI_CREATION_COMPANY_ID],
    defaultCompanyId: STANDARD_ROOFS_COMPANY_ID,
    overwriteExistingRole: true,
  });
  await ensureUserWithCompanyAccess({
    email: "admin@standardroofs.com",
    name: "Prabhakaran T",
    role: UserRole.SUPER_ADMIN,
    companyIds: [STANDARD_ROOFS_COMPANY_ID, INVI_CREATION_COMPANY_ID],
    defaultCompanyId: STANDARD_ROOFS_COMPANY_ID,
    overwriteExistingRole: true,
  });

  // Dedicated Invi Creation Super Admin (locked strictly to Invi Creation)
  await ensureUserWithCompanyAccess({
    email: "admin@invicreation.com",
    name: "Invi Super Admin",
    role: UserRole.SUPER_ADMIN,
    defaultPassword: inviAdminPwd,
    companyIds: [INVI_CREATION_COMPANY_ID],
    defaultCompanyId: INVI_CREATION_COMPANY_ID,
    overwriteExistingRole: true,
  });

  // Dedicated Invi Creation HR (locked strictly to Invi Creation; salaries masked)
  await ensureUserWithCompanyAccess({
    email: "hr@invicreation.com",
    name: "Invi HR",
    role: UserRole.HR_MANAGER,
    defaultPassword: inviHrPwd,
    companyIds: [INVI_CREATION_COMPANY_ID],
    defaultCompanyId: INVI_CREATION_COMPANY_ID,
    overwriteExistingRole: true,
  });

  // Standard Roofs HR Monika (locked strictly to Standard Roofs)
  const monikaEmp = await prisma.employeeOrLabour.findFirst({
    where: { employeeCode: { equals: "SR002", mode: "insensitive" } },
    select: { id: true },
  });
  await ensureUserWithCompanyAccess({
    email: "hr@standardroofs.in",
    name: "Monika",
    role: UserRole.HR_MANAGER,
    defaultPassword: srHrPwd,
    companyIds: [STANDARD_ROOFS_COMPANY_ID],
    defaultCompanyId: STANDARD_ROOFS_COMPANY_ID,
    employeeId: monikaEmp?.id || null,
    overwriteExistingRole: true,
  });

  // Scope remaining users cleanly
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    const emailLow = u.email.toLowerCase();
    if (
      emailLow === "admin@standardroofs.in" ||
      emailLow === "admin@standardroofs.com" ||
      emailLow === "admin@invicreation.com" ||
      emailLow === "hr@invicreation.com" ||
      emailLow === "hr@standardroofs.in"
    ) {
      continue;
    }

    const isInviUser = emailLow.startsWith("invi") || emailLow.includes("invicreation");
    const targetCompany = isInviUser ? INVI_CREATION_COMPANY_ID : STANDARD_ROOFS_COMPANY_ID;
    await prisma.user.update({
      where: { id: u.id },
      data: { defaultCompanyId: targetCompany },
    });
    await prisma.userCompanyAccess.deleteMany({
      where: { userId: u.id, companyId: { not: targetCompany } },
    });
    await prisma.userCompanyAccess.upsert({
      where: { userId_companyId: { userId: u.id, companyId: targetCompany } },
      update: { role: u.role, isDefault: true },
      create: { userId: u.id, companyId: targetCompany, role: u.role, isDefault: true },
    });
  }

  console.log("");
  console.log("=== PROVISIONED CREDENTIALS & MULTI-ORG ACCESS ===");
  console.log("1) Group Super Admin   : admin@standardroofs.in  (Both Standard Roofs <-> Invi Creation)");
  console.log(`2) Invi Super Admin    : admin@invicreation.com  | Password: ${inviAdminPwd} (Locked: Invi Creation)`);
  console.log(`3) Invi HR Manager     : hr@invicreation.com     | Password: ${inviHrPwd} (Locked: Invi Creation, Salaries Masked)`);
  console.log(`4) Standard Roofs HR   : hr@standardroofs.in     | Password: ${srHrPwd} (Locked: Standard Roofs — Monika)`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Setup failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
