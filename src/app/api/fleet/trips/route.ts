import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { postDoubleEntryTransaction } from "@/lib/accounting";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;

    const trips = await prisma.vehicleTripLog.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, entryNumber: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, trips });
  } catch (error: any) {
    console.error("GET /api/fleet/trips error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      vehicleId,
      driverId,
      projectId,
      fromLocation,
      toLocation,
      materialCarried,
      startKm,
      closingKm,
      fuelLiters,
      fuelCost,
      tollCost,
      driverBata,
      maintenanceCost,
      paymentMode,
      bankAccountId,
      notes,
    } = body;

    const start = parseInt(startKm) || 0;
    const end = parseInt(closingKm) || start;
    const totalKm = Math.max(0, end - start);

    const fCost = toDecimal(fuelCost || 0);
    const tCost = toDecimal(tollCost || 0);
    const dBata = toDecimal(driverBata || 0);
    const mCost = toDecimal(maintenanceCost || 0);
    const totalTripCost = fCost.plus(tCost).plus(dBata).plus(mCost);

    // Active FY
    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.financialYear.findFirst();
    if (!fy) throw new Error("No active financial year found");

    // Trip Number
    const count = await prisma.vehicleTripLog.count();
    const tripNumber = `TRP/26-27/${String(count + 1).padStart(4, "0")}`;

    // Admin user for audit
    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No admin user found");

    // Find Vehicle & Driver
    const vehicle = await prisma.cargoVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new Error("Vehicle not found");

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error("Driver not found");

    let journalEntryId: string | null = null;

    // Double-entry posting if totalTripCost > 0
    if (totalTripCost.greaterThan(0)) {
      // Find Fuel & Vehicle Expense account
      let expenseAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "5050" },
            { name: { contains: "Fuel", mode: "insensitive" } },
            { name: { contains: "Vehicle", mode: "insensitive" } },
          ],
        },
      });

      if (!expenseAccount) {
        // Fallback to direct expenses
        expenseAccount = await prisma.account.findFirst({
          where: { type: "EXPENSE" },
        });
      }

      if (!expenseAccount) throw new Error("Expense account not found in Chart of Accounts");

      // Credit account (Cash or Bank)
      let creditAccountId: string;
      if (paymentMode === "BANK" && bankAccountId) {
        const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!bank) throw new Error("Selected bank account not found");
        creditAccountId = bank.accountId;
      } else {
        const cashAcc = await prisma.account.findFirst({
          where: {
            OR: [{ code: "1010" }, { name: { contains: "Cash", mode: "insensitive" } }],
          },
        });
        if (!cashAcc) throw new Error("Cash in Hand account not found");
        creditAccountId = cashAcc.id;
      }

      const narration = `Trip ${tripNumber} [${vehicle.vehicleNumber}] Driver: ${driver.name} | From: ${fromLocation || "Erode Yard"} to ${toLocation} | Fuel: ₹${fCost}, Toll: ₹${tCost}, Bata: ₹${dBata}`;

      const lines = [
        {
          accountId: expenseAccount.id,
          debit: totalTripCost,
          credit: toDecimal(0),
          narration: `Vehicle Trip Cost (${vehicle.vehicleNumber}) - ${toLocation}`,
          projectId: projectId || undefined,
        },
        {
          accountId: creditAccountId,
          debit: toDecimal(0),
          credit: totalTripCost,
          narration: `Paid via ${paymentMode || "CASH"} for Trip ${tripNumber}`,
          projectId: projectId || undefined,
        },
      ];

      const jEntry = await postDoubleEntryTransaction({
        date: date ? new Date(date) : new Date(),
        voucherType: "FLEET_TRIP",
        narration,
        financialYearId: fy.id,
        lines,
        createdById: adminUser.id,
        referenceNumber: tripNumber,
      });

      journalEntryId = jEntry.id;
    }

    // Create Trip Record & update vehicle Odometer
    const trip = await prisma.$transaction(async (tx) => {
      const createdTrip = await tx.vehicleTripLog.create({
        data: {
          tripNumber,
          date: date ? new Date(date) : new Date(),
          vehicleId,
          driverId,
          projectId: projectId || null,
          fromLocation: fromLocation || "Erode Yard",
          toLocation,
          materialCarried,
          startKm: start,
          closingKm: end,
          totalKm,
          fuelLiters: new Decimal(fuelLiters || 0),
          fuelCost: new Decimal(fCost.toString()),
          tollCost: new Decimal(tCost.toString()),
          driverBata: new Decimal(dBata.toString()),
          maintenanceCost: new Decimal(mCost.toString()),
          totalCost: new Decimal(totalTripCost.toString()),
          paymentMode: paymentMode || "CASH",
          bankAccountId: bankAccountId || null,
          journalEntryId,
          notes,
        },
      });

      // Update vehicle odometer
      if (end > vehicle.odometerKm) {
        await tx.cargoVehicle.update({
          where: { id: vehicleId },
          data: { odometerKm: end },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "VehicleTripLog",
          entityId: createdTrip.id,
          newValues: JSON.stringify({ tripNumber, vehicleNumber: vehicle.vehicleNumber, totalKm, totalTripCost }),
          performedById: adminUser.id,
        },
      });

      return createdTrip;
    });

    return NextResponse.json({ success: true, trip });
  } catch (error: any) {
    console.error("POST /api/fleet/trips error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
