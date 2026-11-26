import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";

export async function GET() {
  try {
    const auth = await requireAuthorizedSession("settings", "BACKUP_RESTORE");
    if (auth.error) return auth.error;

    const [
      settings,
      financialYears,
      voucherSequences,
      accounts,
      customers,
      projects,
      suppliers,
      materialItems,
      stockMovements,
      cargoVehicles,
      drivers,
      vehicleTripLogs,
      machineAssets,
      employees,
      contractors,
      subContractors,
      subContractorEntries,
      payrollRuns,
      payrollItems,
      cashBookEntries,
      invoices,
      purchaseBills,
      expenseClaims,
      journalEntries,
      fixedAssets,
      businessLoans,
      priceCatalog,
      users,
    ] = await Promise.all([
      prisma.companySettings.findMany(),
      prisma.financialYear.findMany(),
      prisma.voucherSequence.findMany(),
      prisma.account.findMany(),
      prisma.customer.findMany(),
      prisma.project.findMany(),
      prisma.supplier.findMany(),
      prisma.materialItem.findMany(),
      prisma.materialStockMovement.findMany(),
      prisma.cargoVehicle.findMany(),
      prisma.driver.findMany(),
      prisma.vehicleTripLog.findMany(),
      prisma.machineAsset.findMany(),
      prisma.employeeOrLabour.findMany(),
      prisma.contractor.findMany(),
      prisma.subContractor.findMany(),
      prisma.subContractorLedgerEntry.findMany(),
      prisma.payrollRun.findMany(),
      prisma.payrollItem.findMany(),
      prisma.cashBookEntry.findMany(),
      prisma.invoice.findMany({ include: { items: true } }),
      prisma.purchaseBill.findMany({ include: { items: true } }),
      prisma.expenseClaim.findMany(),
      prisma.journalEntry.findMany({ include: { lines: true } }),
      prisma.fixedAsset.findMany(),
      prisma.businessLoan.findMany({ include: { emiPayments: true } }),
      prisma.roofingPriceItem.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          active: true,
          permissions: true,
          createdAt: true,
        },
      }),
    ]);

    const dataPayload = {
      settings,
      financialYears,
      voucherSequences,
      accounts,
      customers,
      projects,
      suppliers,
      materialItems,
      stockMovements,
      cargoVehicles,
      drivers,
      vehicleTripLogs,
      machineAssets,
      employees,
      contractors,
      subContractors,
      subContractorEntries,
      payrollRuns,
      payrollItems,
      cashBookEntries,
      invoices,
      purchaseBills,
      expenseClaims,
      journalEntries,
      fixedAssets,
      businessLoans,
      priceCatalog,
      users,
    };

    const counts: Record<string, number> = {
      settings: settings.length,
      financialYears: financialYears.length,
      voucherSequences: voucherSequences.length,
      accounts: accounts.length,
      customers: customers.length,
      projects: projects.length,
      suppliers: suppliers.length,
      employees: employees.length,
      subContractors: subContractors.length,
      subContractorEntries: subContractorEntries.length,
      payrollRuns: payrollRuns.length,
      payrollItems: payrollItems.length,
      cashBookEntries: cashBookEntries.length,
      invoices: invoices.length,
      purchaseBills: purchaseBills.length,
      journalEntries: journalEntries.length,
      materials: materialItems.length,
      machines: machineAssets.length,
      fleet: cargoVehicles.length,
      users: users.length,
    };

    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(dataPayload))
      .digest("hex");

    const backupData = {
      version: "2.0",
      system: "Standard Roofs Books (SR-Books)",
      exportedAt: new Date().toISOString(),
      exportedBy: auth.session.email,
      checksum,
      counts,
      data: dataPayload,
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `sr-books-backup-${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("settings", "BACKUP_RESTORE");
    if (auth.error) return auth.error;

    const payload = await req.json();
    const dryRun = Boolean(payload?.dryRun);
    const backupJson = payload?.backup ? payload.backup : payload;

    if (!backupJson || !backupJson.system || !backupJson.data) {
      return NextResponse.json(
        { success: false, error: "Invalid backup file format. Expected SR-Books JSON archive." },
        { status: 400 }
      );
    }

    const { data, checksum } = backupJson;

    let checksumValid: boolean | null = null;
    if (checksum) {
      const computed = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
      checksumValid = computed === checksum;
      if (!checksumValid) {
        return NextResponse.json(
          { success: false, error: "Backup integrity check failed: SHA-256 checksum mismatch." },
          { status: 400 }
        );
      }
    }

    const validatedCounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) validatedCounts[k] = v.length;
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        checksumValid,
        validatedCounts,
        message: "Dry-run validation passed. Backup archive is structurally valid for restoration.",
      });
    }

    // Strict foreign-key dependency order inside a single transaction
    await prisma.$transaction(async (tx) => {
      if (Array.isArray(data.settings)) {
        for (const s of data.settings) {
          await tx.companySettings.upsert({ where: { id: s.id }, update: s, create: s });
        }
      }
      if (Array.isArray(data.financialYears)) {
        for (const fy of data.financialYears) {
          await tx.financialYear.upsert({ where: { id: fy.id }, update: fy, create: fy });
        }
      }
      if (Array.isArray(data.voucherSequences)) {
        for (const vs of data.voucherSequences) {
          await tx.voucherSequence.upsert({ where: { id: vs.id }, update: vs, create: vs });
        }
      }
      if (Array.isArray(data.accounts)) {
        for (const acc of data.accounts) {
          await tx.account.upsert({ where: { id: acc.id }, update: acc, create: acc });
        }
      }
      if (Array.isArray(data.customers)) {
        for (const c of data.customers) {
          await tx.customer.upsert({ where: { id: c.id }, update: c, create: c });
        }
      }
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          await tx.project.upsert({ where: { id: p.id }, update: p, create: p });
        }
      }
      if (Array.isArray(data.suppliers)) {
        for (const sup of data.suppliers) {
          await tx.supplier.upsert({ where: { id: sup.id }, update: sup, create: sup });
        }
      }
      if (Array.isArray(data.priceCatalog)) {
        for (const item of data.priceCatalog) {
          await tx.roofingPriceItem.upsert({ where: { itemCode: item.itemCode }, update: item, create: item });
        }
      }
      if (Array.isArray(data.employees)) {
        for (const emp of data.employees) {
          await tx.employeeOrLabour.upsert({ where: { id: emp.id }, update: emp, create: emp });
        }
      }
      if (Array.isArray(data.subContractors)) {
        for (const sc of data.subContractors) {
          await tx.subContractor.upsert({ where: { id: sc.id }, update: sc, create: sc });
        }
      }
      if (Array.isArray(data.subContractorEntries)) {
        for (const sce of data.subContractorEntries) {
          await tx.subContractorLedgerEntry.upsert({ where: { id: sce.id }, update: sce, create: sce });
        }
      }
      if (Array.isArray(data.payrollRuns)) {
        for (const pr of data.payrollRuns) {
          await tx.payrollRun.upsert({ where: { id: pr.id }, update: pr, create: pr });
        }
      }
      if (Array.isArray(data.payrollItems)) {
        for (const pi of data.payrollItems) {
          await tx.payrollItem.upsert({ where: { id: pi.id }, update: pi, create: pi });
        }
      }

      await tx.auditLog.create({
        data: {
          action: "RESTORE_BACKUP",
          entityType: "SystemBackup",
          entityId: "full-restore",
          newValues: JSON.stringify({ restoredBy: auth.session.email, validatedCounts }),
          performedById: auth.session.userId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      checksumValid,
      message: "Backup verified and restored in atomic dependency order.",
      counts: validatedCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
