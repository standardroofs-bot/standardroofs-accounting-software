import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const backupData = {
      version: "1.0",
      system: "Standard Roofs Books (SR-Books)",
      exportedAt: new Date().toISOString(),
      counts: {
        accounts: accounts.length,
        customers: customers.length,
        projects: projects.length,
        invoices: invoices.length,
        journalEntries: journalEntries.length,
        materials: materialItems.length,
        machines: machineAssets.length,
        fleet: cargoVehicles.length,
        users: users.length,
      },
      data: {
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
        invoices,
        purchaseBills,
        expenseClaims,
        journalEntries,
        fixedAssets,
        businessLoans,
        priceCatalog,
        users,
      },
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
    const backupJson = await req.json();

    if (!backupJson || !backupJson.system || !backupJson.data) {
      return NextResponse.json(
        { success: false, error: "Invalid backup file format. Expected SR-Books JSON archive." },
        { status: 400 }
      );
    }

    const { data } = backupJson;

    // Restore Company Settings
    if (data.settings && data.settings.length > 0) {
      for (const s of data.settings) {
        await prisma.companySettings.upsert({
          where: { id: s.id },
          update: s,
          create: s,
        });
      }
    }

    // Restore Price Catalog
    if (data.priceCatalog && data.priceCatalog.length > 0) {
      for (const item of data.priceCatalog) {
        await prisma.roofingPriceItem.upsert({
          where: { itemCode: item.itemCode },
          update: item,
          create: item,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Backup verified and metadata restored successfully.",
      counts: backupJson.counts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
