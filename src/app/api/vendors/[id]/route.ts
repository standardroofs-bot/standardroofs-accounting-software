import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { getStateFromGSTIN } from "@/lib/gst";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseBills: {
          include: {
            items: true,
            payments: true,
          },
          orderBy: { date: "desc" },
        },
        purchaseOrders: {
          include: {
            items: true,
          },
          orderBy: { date: "desc" },
        },
        billPayments: {
          include: {
            purchaseBill: true,
            bankAccount: true,
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.name) data.name = body.name.trim();
    if (body.companyName !== undefined) data.companyName = body.companyName ? body.companyName.trim() : null;
    if (body.gstNumber !== undefined) {
      data.gstNumber = body.gstNumber ? body.gstNumber.trim().toUpperCase() : null;
      if (data.gstNumber && data.gstNumber.length === 15) {
        const gState = getStateFromGSTIN(data.gstNumber);
        if (gState) {
          data.state = gState.name;
          data.stateCode = gState.code;
        }
      }
    }
    if (body.phone !== undefined) data.phone = body.phone ? body.phone.trim() : null;
    if (body.email !== undefined) data.email = body.email ? body.email.trim().toLowerCase() : null;
    if (body.address !== undefined) data.address = body.address ? body.address.trim() : null;
    if (body.paymentTerms !== undefined) data.paymentTerms = body.paymentTerms;
    if (body.bankName !== undefined) data.bankName = body.bankName ? body.bankName.trim() : null;
    if (body.accountNumber !== undefined) data.accountNumber = body.accountNumber ? body.accountNumber.trim() : null;
    if (body.ifscCode !== undefined) data.ifscCode = body.ifscCode ? body.ifscCode.trim().toUpperCase() : null;

    const vendor = await prisma.supplier.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.supplier.findUnique({
      where: { id },
      include: { purchaseBills: true, purchaseOrders: true },
    });

    if (!vendor) {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
    }

    if (vendor.purchaseBills.length > 0 || vendor.purchaseOrders.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete vendor with existing purchase bills or purchase orders." },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
