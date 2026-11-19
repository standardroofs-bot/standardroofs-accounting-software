import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            invoices: true,
          },
        },
        invoices: {
          where: { isArchived: false },
          include: {
            items: true,
            payments: true,
          },
          orderBy: { date: "desc" },
        },
        journalLines: {
          include: {
            journalEntry: true,
            account: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Build chronological ledger statement (Invoices as Debits, Payments as Credits)
    type LedgerEvent = {
      date: Date;
      type: "INVOICE" | "PAYMENT" | "OPENING";
      voucherNumber: string;
      narration: string;
      debit: string;
      credit: string;
      balance: string;
    };

    const ledgerEvents: LedgerEvent[] = [];
    let runningBalance = toDecimal(customer.openingBalance);

    if (runningBalance.greaterThan(0)) {
      ledgerEvents.push({
        date: customer.createdAt,
        type: "OPENING",
        voucherNumber: "OB-001",
        narration: "Opening Balance Brought Forward",
        debit: runningBalance.toFixed(2),
        credit: "0.00",
        balance: runningBalance.toFixed(2),
      });
    }

    // Combine invoices & payments in chronological order
    const events: Array<{ date: Date; type: "INVOICE" | "PAYMENT"; raw: any }> = [];
    customer.invoices.forEach((inv) => {
      events.push({ date: new Date(inv.date), type: "INVOICE", raw: inv });
      inv.payments.forEach((pmt) => {
        events.push({ date: new Date(pmt.paymentDate), type: "PAYMENT", raw: { ...pmt, invoiceNumber: inv.invoiceNumber } });
      });
    });

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const ev of events) {
      if (ev.type === "INVOICE") {
        const inv = ev.raw;
        const total = toDecimal(inv.totalAmount);
        runningBalance = runningBalance.plus(total);
        ledgerEvents.push({
          date: ev.date,
          type: "INVOICE",
          voucherNumber: inv.invoiceNumber,
          narration: `Tax Invoice: ${inv.invoiceNumber} (${inv.items.length} items)`,
          debit: total.toFixed(2),
          credit: "0.00",
          balance: runningBalance.toFixed(2),
        });
      } else {
        const pmt = ev.raw;
        const paid = toDecimal(pmt.amount).plus(toDecimal(pmt.tdsAmount));
        runningBalance = runningBalance.minus(paid);
        ledgerEvents.push({
          date: ev.date,
          type: "PAYMENT",
          voucherNumber: pmt.referenceNumber || "PMT",
          narration: `Payment Received for ${pmt.invoiceNumber} via ${pmt.paymentMode} ${pmt.tdsAmount > 0 ? `(TDS: ₹${pmt.tdsAmount})` : ""}`,
          debit: "0.00",
          credit: paid.toFixed(2),
          balance: runningBalance.toFixed(2),
        });
      }
    }

    return NextResponse.json({
      success: true,
      customer,
      ledgerStatement: ledgerEvents,
      closingBalance: runningBalance.toFixed(2),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, companyName, gstNumber, panNumber, state, stateCode, billingAddress, shippingAddress, email, phone, creditDays } = body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        companyName,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        state,
        stateCode,
        billingAddress,
        shippingAddress,
        email,
        phone,
        creditDays: Number(creditDays) || 30,
      },
    });

    return NextResponse.json({ success: true, customer });
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
    const { action } = body;

    if (action === "restore") {
      const restored = await prisma.customer.update({
        where: { id },
        data: { isArchived: false, archivedAt: null },
      });
      return NextResponse.json({ success: true, message: "Customer restored from Archive", customer: restored });
    }

    if (action === "archive") {
      const archived = await prisma.customer.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Customer moved to Archive", customer: archived });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { invoices: { where: { isArchived: false } } },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Soft-delete to Archive (never permanently deletes active records)
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer moved to Archive successfully",
      customer: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
