import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { validateGSTIN, getStateCodeFromGSTIN, INDIAN_STATES } from "@/lib/gst";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        purchaseBills: {
          select: {
            id: true,
            billNumber: true,
            vendorInvoiceNumber: true,
            date: true,
            dueDate: true,
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            status: true,
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = suppliers.map((sup) => {
      let totalDue = toDecimal(0);
      sup.purchaseBills.forEach((pb) => {
        if (pb.status !== "PAID") {
          totalDue = totalDue.plus(toDecimal(pb.balanceDue));
        }
      });
      return {
        ...sup,
        totalPayable: totalDue.toFixed(2),
      };
    });

    return NextResponse.json({ success: true, suppliers: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      companyName,
      gstNumber,
      panNumber,
      state = "Tamil Nadu",
      stateCode = "33",
      address,
      email,
      phone,
      paymentTerms = "30 Days",
      bankName,
      accountNumber,
      ifscCode,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Supplier Name is required." }, { status: 400 });
    }

    if (gstNumber && !validateGSTIN(gstNumber)) {
      return NextResponse.json({ success: false, error: "Invalid 15-digit GSTIN format." }, { status: 400 });
    }

    const resolvedStateCode = gstNumber ? getStateCodeFromGSTIN(gstNumber) : (stateCode || "33");
    const resolvedState = INDIAN_STATES[resolvedStateCode] || state || "Tamil Nadu";

    const supplier = await prisma.supplier.create({
      data: {
        name,
        companyName: companyName || null,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : (gstNumber ? gstNumber.substring(2, 12) : null),
        state: resolvedState,
        stateCode: resolvedStateCode,
        address: address || null,
        email: email || null,
        phone: phone || null,
        paymentTerms,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
