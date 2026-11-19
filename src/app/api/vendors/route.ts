import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { validateGSTIN, getStateFromGSTIN } from "@/lib/gst";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const suppliers = await prisma.supplier.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { companyName: { contains: search, mode: "insensitive" } },
              { gstNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        purchaseBills: {
          select: {
            id: true,
            billNumber: true,
            date: true,
            dueDate: true,
            totalAmount: true,
            balanceDue: true,
            status: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            poNumber: true,
            date: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const vendorsWithAgeing = suppliers.map((s) => {
      let currentPayable = 0;
      let overduePayable = 0;
      const now = new Date();

      s.purchaseBills.forEach((b) => {
        const bal = Number(b.balanceDue || 0);
        if (bal > 0) {
          if (b.dueDate && new Date(b.dueDate) < now) {
            overduePayable += bal;
          } else {
            currentPayable += bal;
          }
        }
      });

      return {
        ...s,
        totalPayable: Number(s.outstandingBalance || 0),
        currentPayable,
        overduePayable,
        billsCount: s.purchaseBills.length,
        ordersCount: s.purchaseOrders.length,
      };
    });

    return NextResponse.json({ success: true, vendors: vendorsWithAgeing });
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
      phone,
      email,
      address,
      state,
      stateCode,
      paymentTerms,
      bankName,
      accountNumber,
      ifscCode,
      openingBalance = 0,
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "Vendor name is required." }, { status: 400 });
    }

    let finalState = state || "Tamil Nadu";
    let finalStateCode = stateCode || "33";

    if (gstNumber && gstNumber.trim().length === 15) {
      const gState = getStateFromGSTIN(gstNumber.trim().toUpperCase());
      if (gState) {
        finalState = gState.name;
        finalStateCode = gState.code;
      }
    }

    const vendor = await prisma.supplier.create({
      data: {
        name: name.trim(),
        companyName: companyName ? companyName.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : (gstNumber && gstNumber.length >= 12 ? gstNumber.slice(2, 12).toUpperCase() : null),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        address: address ? address.trim() : null,
        state: finalState,
        stateCode: finalStateCode,
        paymentTerms: paymentTerms || "30 Days",
        bankName: bankName ? bankName.trim() : null,
        accountNumber: accountNumber ? accountNumber.trim() : null,
        ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : null,
        outstandingBalance: toDecimal(openingBalance),
      },
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
