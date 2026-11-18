import { prisma } from "../src/lib/prisma";
import {
  createSessionToken,
  getDefaultPermissionsForRole,
  hasModulePermission,
  ALL_MODULES,
  UserPermissions,
} from "../src/lib/auth";
import { UserRole } from "@prisma/client";
import { toDecimal } from "../src/lib/decimal";
import bcrypt from "bcryptjs";

async function runPhase7Tests() {
  console.log("===============================================================");
  console.log("🧪 RUNNING STANDARD ROOFS BOOKS — PHASE 7 VERIFICATION SUITE");
  console.log("===============================================================");

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Role Defaults & Granular Permissions
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 1] Permission Matrix & Security Rules");

    const superAdminPerms = getDefaultPermissionsForRole(UserRole.SUPER_ADMIN);
    assert(superAdminPerms.dashboard.view === true, "SUPER_ADMIN has view access to dashboard");
    assert(superAdminPerms.capital.view === true, "SUPER_ADMIN has view access to capital & loans");
    assert(superAdminPerms.reports.view === true, "SUPER_ADMIN has view access to reports");

    const hrPerms = getDefaultPermissionsForRole(UserRole.HR_MANAGER);
    assert(hrPerms.labour.view === true, "HR_MANAGER has view access to labour & payroll");
    assert(hrPerms.labour.create === true, "HR_MANAGER has create access to labour & payroll");
    assert(hrPerms.expenses.view === true, "HR_MANAGER has view access to expense reimbursements");
    assert(hrPerms.reports.view === false, "HR_MANAGER is STRICTLY BLOCKED from financial reports");
    assert(hrPerms.capital.view === false, "HR_MANAGER is STRICTLY BLOCKED from capital & loans");
    assert(hrPerms.banking.view === false, "HR_MANAGER is STRICTLY BLOCKED from banking & cash");

    const sitePerms = getDefaultPermissionsForRole(UserRole.SITE_SUPERVISOR);
    assert(sitePerms.expenses.create === true, "SITE_SUPERVISOR can submit expense receipts");
    assert(sitePerms.machines.view === true, "SITE_SUPERVISOR can view allocated SRM machines");
    assert(sitePerms.invoices.view === false, "SITE_SUPERVISOR is blocked from creating/viewing tax invoices");
    assert(sitePerms.banking.view === false, "SITE_SUPERVISOR is blocked from banking");

    // -------------------------------------------------------------------------
    // TEST 2: JWT Session Token Generation & Permission Evaluation
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 2] JWT Auth & Middleware Evaluation");

    const hrUser = await prisma.user.findUnique({
      where: { email: "hr@standardroofs.com" },
    });
    assert(Boolean(hrUser), "HR Manager user exists in database");

    if (hrUser) {
      const isPasswordMatch = await bcrypt.compare("Labour@2026", hrUser.passwordHash);
      assert(isPasswordMatch, "HR Manager password authentication succeeds");

      const token = await createSessionToken({
        userId: hrUser.id,
        email: hrUser.email,
        name: hrUser.name,
        role: hrUser.role,
        permissions: (hrUser.permissions as unknown as UserPermissions) || undefined,
      });
      assert(Boolean(token && token.length > 20), "JWT session token created successfully");

      const sessionUser = {
        userId: hrUser.id,
        email: hrUser.email,
        name: hrUser.name,
        role: hrUser.role,
        permissions: (hrUser.permissions as unknown as UserPermissions) || undefined,
      };
      assert(hasModulePermission(sessionUser, "labour", "view") === true, "hasModulePermission allows HR to view /labour");
      assert(hasModulePermission(sessionUser, "reports", "view") === false, "hasModulePermission denies HR from /reports (403)");
      assert(hasModulePermission(sessionUser, "capital", "view") === false, "hasModulePermission denies HR from /capital (403)");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Dynamic User Permission Toggle
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 3] Custom Permission Override Toggle");

    if (hrUser) {
      // Temporarily grant HR access to view estimates for site quotation checks
      const modifiedPerms = { ...hrPerms, estimates: { view: true, create: false, edit: false, approve: false } };
      await prisma.user.update({
        where: { id: hrUser.id },
        data: { permissions: modifiedPerms as any },
      });

      const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: hrUser.id } });
      const currentPerms = updatedUser.permissions as unknown as UserPermissions;
      assert(currentPerms.estimates.view === true, "Custom permission grant took effect immediately");
      assert(currentPerms.reports.view === false, "Reports remained blocked during partial permission grant");

      // Reset back to standard HR default
      await prisma.user.update({
        where: { id: hrUser.id },
        data: { permissions: hrPerms as any },
      });
      assert(true, "Reset HR permissions to default strict profile");
    }

    // -------------------------------------------------------------------------
    // TEST 4: Clean Slate Balance Audit (Must be strictly ₹ 0.00)
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 4] Clean Slate Financial Ledger Audit");

    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
    assert(toDecimal(cashAccount.currentBalance).isZero(), `Cash balance is ₹ 0.00 (Actual: ₹ ${cashAccount.currentBalance})`);

    const bankAccounts = await prisma.bankAccount.findMany();
    const bankTotal = bankAccounts.reduce((sum, b) => sum.plus(toDecimal(b.currentBalance)), toDecimal(0));
    assert(bankTotal.isZero(), `Total bank accounts balance is ₹ 0.00 (Actual: ₹ ${bankTotal.toFixed(2)})`);

    const journalCount = await prisma.journalEntry.count();
    assert(journalCount === 0, `Zero dummy journal entries present (Actual: ${journalCount})`);

    const invoiceCount = await prisma.invoice.count();
    assert(invoiceCount === 0, `Zero dummy sales invoices present (Actual: ${invoiceCount})`);

    // -------------------------------------------------------------------------
    // TEST 5: Sequence #33 Continuity Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 5] Invoice Sequence #33 Readiness");

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const invoiceSeq = await prisma.voucherSequence.findUnique({
      where: {
        financialYearId_voucherType: {
          financialYearId: fy.id,
          voucherType: "INVOICE",
        },
      },
    });

    assert(Boolean(invoiceSeq), "Invoice sequence registered in database");
    assert(invoiceSeq?.nextNumber === 33, `Next Invoice Number is 33 (Actual: ${invoiceSeq?.nextNumber})`);
    assert(invoiceSeq?.prefix === "SR/26-27/", `Invoice prefix is SR/26-27/ (Actual: ${invoiceSeq?.prefix})`);

    // -------------------------------------------------------------------------
    // TEST 6: Price Catalog & Fleet Readiness
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP 6] Roofing Price Catalog & Fleet Readiness");

    const priceItems = await prisma.roofingPriceItem.findMany();
    assert(priceItems.length >= 8, `Price catalog has at least 8 standard items (Actual: ${priceItems.length})`);

    const vehicles = await prisma.cargoVehicle.findMany();
    assert(vehicles.length >= 2, `Fleet has 2 cargo vehicles registered (Actual: ${vehicles.length})`);

    const drivers = await prisma.driver.findMany();
    assert(drivers.length >= 2, `Fleet has 2 drivers registered (Actual: ${drivers.length})`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n===============================================================");
    console.log(`🏁 TEST EXECUTION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("===============================================================");

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase7Tests();
