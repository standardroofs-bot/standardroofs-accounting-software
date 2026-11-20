import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { validateGSTIN, getStateCodeFromGSTIN, INDIAN_STATES } from "@/lib/gst";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived");

    const where: any = {};
    if (archived === "true") {
      where.isArchived = true;
    } else if (archived === "all") {
      // all
    } else {
      where.isArchived = false;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        projects: { select: { id: true, code: true, name: true, status: true } },
        invoices: {
          where: { isArchived: false },
          select: {
            id: true,
            invoiceNumber: true,
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

    // Calculate AR Ageing for each customer
    const now = new Date();
    const enriched = customers.map((cust) => {
      let bucket0_15 = toDecimal(0);
      let bucket16_30 = toDecimal(0);
      let bucket31_60 = toDecimal(0);
      let bucket60_plus = toDecimal(0);
      let totalDue = toDecimal(0);

      cust.invoices.forEach((inv) => {
        if (inv.status !== "PAID" && inv.status !== "CANCELLED") {
          const due = toDecimal(inv.balanceDue.isZero() ? inv.totalAmount.minus(inv.amountPaid) : inv.balanceDue);
          if (due.greaterThan(0)) {
            totalDue = totalDue.plus(due);
            const refDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
            const ageDays = Math.max(0, Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));

            if (ageDays <= 15) {
              bucket0_15 = bucket0_15.plus(due);
            } else if (ageDays <= 30) {
              bucket16_30 = bucket16_30.plus(due);
            } else if (ageDays <= 60) {
              bucket31_60 = bucket31_60.plus(due);
            } else {
              bucket60_plus = bucket60_plus.plus(due);
            }
          }
        }
      });

      return {
        ...cust,
        outstandingBalance: totalDue.toFixed(2),
        ageing: {
          bucket0_15: bucket0_15.toFixed(2),
          bucket16_30: bucket16_30.toFixed(2),
          bucket31_60: bucket31_60.toFixed(2),
          bucket60_plus: bucket60_plus.toFixed(2),
          totalDue: totalDue.toFixed(2),
        },
      };
    });

    return NextResponse.json({ success: true, customers: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Universal Bulk Excel/CSV Import handler
    if (body.bulk && Array.isArray(body.items)) {
      let inserted = 0;
      for (const item of body.items) {
        const cName = item.name || item["Customer Name"] || item["Name"];
        const bAddress =
          item.billingAddress || item["Billing Address"] || item["Address"] || "Erode, Tamil Nadu";
        if (!cName) continue;
        const gstin = item.gstNumber || item["GSTIN"] || item["GST Number"] || null;
        const phone = item.phone || item["Phone"] || item["Mobile"] || null;
        const email = item.email || item["Email"] || null;
        const state = item.state || item["State"] || "Tamil Nadu";
        const stateCode = gstin ? getStateCodeFromGSTIN(gstin) : "33";

        const existing = await prisma.customer.findFirst({
          where: { name: cName },
        });

        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              phone: phone ? String(phone) : existing.phone,
              email: email ? String(email) : existing.email,
              gstNumber: gstin ? gstin.trim().toUpperCase() : existing.gstNumber,
            },
          });
        } else {
          await prisma.customer.create({
            data: {
              name: cName,
              billingAddress: bAddress,
              shippingAddress: bAddress,
              gstNumber: gstin ? gstin.trim().toUpperCase() : null,
              phone: phone ? String(phone) : null,
              email: email ? String(email) : null,
              state: state,
              stateCode: stateCode,
              creditDays: 30,
              openingBalance: "0.00",
              outstandingBalance: "0.00",
            },
          });
        }
        inserted++;
      }
      return NextResponse.json({ success: true, count: inserted });
    }

    const {
      name,
      companyName,
      gstNumber,
      panNumber,
      state = "Tamil Nadu",
      stateCode = "33",
      billingAddress,
      shippingAddress,
      email,
      phone,
      creditDays = 30,
      openingBalance = 0,
    } = body;

    if (!name || !billingAddress) {
      return NextResponse.json(
        { success: false, error: "Customer Name and Billing Address are mandatory." },
        { status: 400 }
      );
    }

    if (gstNumber && !validateGSTIN(gstNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid 15-digit Indian GSTIN format (e.g. 33AAAAA0000A1Z5)" },
        { status: 400 }
      );
    }

    const resolvedStateCode = gstNumber ? getStateCodeFromGSTIN(gstNumber) : (stateCode || "33");
    const resolvedState = INDIAN_STATES[resolvedStateCode] || state || "Tamil Nadu";

    const customer = await prisma.customer.create({
      data: {
        name,
        companyName: companyName || null,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : (gstNumber ? gstNumber.substring(2, 12) : null),
        state: resolvedState,
        stateCode: resolvedStateCode,
        billingAddress,
        shippingAddress: shippingAddress || billingAddress,
        email: email || null,
        phone: phone || null,
        creditDays: Number(creditDays) || 30,
        openingBalance: toDecimal(openingBalance).toFixed(2),
        outstandingBalance: toDecimal(openingBalance).toFixed(2),
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
