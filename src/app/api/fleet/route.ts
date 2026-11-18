import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const vehicles = await prisma.cargoVehicle.findMany({
      include: {
        trips: {
          orderBy: { date: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const drivers = await prisma.driver.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, vehicles, drivers });
  } catch (error: any) {
    console.error("GET /api/fleet error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "ADD_VEHICLE") {
      const { vehicleNumber, vehicleType, modelName, odometerKm, insuranceExpiry, fitnessExpiry, permitExpiry, notes } = body;

      const vehicle = await prisma.cargoVehicle.create({
        data: {
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          vehicleType,
          modelName,
          odometerKm: parseInt(odometerKm) || 0,
          insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
          fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
          permitExpiry: permitExpiry ? new Date(permitExpiry) : null,
          notes,
          status: "ACTIVE",
        },
      });

      return NextResponse.json({ success: true, vehicle });
    }

    if (action === "ADD_DRIVER") {
      const { name, licenseNumber, phone, salaryType, monthlySalary, tripBataRate } = body;

      const driver = await prisma.driver.create({
        data: {
          name,
          licenseNumber,
          phone,
          salaryType: salaryType || "MONTHLY",
          monthlySalary: monthlySalary || 0,
          tripBataRate: tripBataRate || 0,
          active: true,
        },
      });

      return NextResponse.json({ success: true, driver });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/fleet error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
