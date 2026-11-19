import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [systems, colors, customers, settings] = await Promise.all([
      prisma.roofingSystemMaster.findMany({
        orderBy: [{ material: "asc" }, { roofType: "asc" }],
      }),
      prisma.productColorMaster.findMany({
        orderBy: { colorName: "asc" },
      }),
      prisma.customer.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.systemSettings.findFirst(),
    ]);

    // Predefined Staff Contacts with phone numbers
    const staff = {
      supervisors: [
        { name: "Saran", mobile: "+91 98427 12345", role: "Site Supervisor" },
        { name: "Thennarasu", mobile: "+91 98428 12345", role: "Site Supervisor" },
        { name: "Santhosh", mobile: "+91 98429 12345", role: "Site Supervisor" },
        { name: "Tamil", mobile: "+91 98426 12345", role: "Site Supervisor" },
        { name: "Sathish", mobile: "+91 98425 12345", role: "Site Supervisor" },
      ],
      managers: [
        { name: "Prabhakaran T", mobile: "+91 86084 75767", role: "Managing Director" },
        { name: "Gowri Sankar", mobile: "+91 98424 12345", role: "Operations Manager" },
        { name: "Siva Kumar", mobile: "+91 98423 12345", role: "Yard & Project Manager" },
      ],
      accountants: [
        { name: "Senior Accountant", mobile: "+91 98421 12345", role: "Chief Accountant" },
        { name: "Accounts Officer", mobile: "+91 98422 12345", role: "Accounts Executive" },
      ],
    };

    return NextResponse.json({
      success: true,
      systems,
      colors,
      customers,
      staff,
      nextSerialNo: `SR-${String((settings?.lastQuoteSerialNumber || 0) + 1).padStart(5, "0")}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
