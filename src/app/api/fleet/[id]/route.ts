import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type, ...data } = body;

    if (type === "DRIVER") {
      const driver = await prisma.driver.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          licenseNumber: data.licenseNumber,
          monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
          tripBataRate: data.tripBataRate ? Number(data.tripBataRate) : undefined,
        },
      });
      return NextResponse.json({ success: true, driver });
    }

    const vehicle = await prisma.cargoVehicle.update({
      where: { id },
      data: {
        vehicleNumber: data.vehicleNumber ? data.vehicleNumber.toUpperCase() : undefined,
        vehicleType: data.vehicleType,
        modelName: data.modelName,
        odometerKm: data.odometerKm !== undefined ? parseInt(data.odometerKm) : undefined,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
        fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : undefined,
        permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : undefined,
        status: data.status,
      },
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    console.error("PUT /api/fleet/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "DRIVER") {
      await prisma.driver.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Driver removed" });
    }

    await prisma.cargoVehicle.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Vehicle removed" });
  } catch (error: any) {
    console.error("DELETE /api/fleet/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
