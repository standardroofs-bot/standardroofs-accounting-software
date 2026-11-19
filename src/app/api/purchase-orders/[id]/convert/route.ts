import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        project: true,
        items: true,
      },
    });

    if (!po) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    if (po.status === "BILLED" && po.convertedBillId) {
      return NextResponse.json({ success: false, error: "Purchase Order has already been converted to a Bill." }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts
    const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } }); // Accounts Payable
    const steelAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5010" } }); // Raw Materials
    const cgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1060" } }); // CGST ITC
    const sgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1061" } }); // SGST ITC
    const igstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1062" } }); // IGST ITC

    const voucherInfo = await getNextVoucherNumber(fy.id, "PURCHASE_BILL");
    const billNumber = voucherInfo.voucherNumber;

    const isInterState = po.supplier.stateCode !== COMPANY_GST_STATE_CODE;

    // Double-Entry Journal Lines
    const journalLines: any[] = [
      {
        accountId: steelAccount.id,
        debit: po.subTotal,
        credit: 0,
        narration: `Purchase Bill ${billNumber} converted from ${po.poNumber}`,
        supplierId: po.supplierId,
        projectId: po.projectId || undefined,
      },
    ];

    if (isInterState) {
      if (Number(po.igstTotal) > 0) {
        journalLines.push({
          accountId: igstItcAccount.id,
          debit: po.igstTotal,
          credit: 0,
          narration: `IGST Input Tax Credit on ${billNumber}`,
          supplierId: po.supplierId,
          projectId: po.projectId || undefined,
        });
      }
    } else {
      if (Number(po.cgstTotal) > 0) {
        journalLines.push({
          accountId: cgstItcAccount.id,
          debit: po.cgstTotal,
          credit: 0,
          narration: `CGST Input Tax Credit on ${billNumber}`,
          supplierId: po.supplierId,
          projectId: po.projectId || undefined,
        });
      }
      if (Number(po.sgstTotal) > 0) {
        journalLines.push({
          accountId: sgstItcAccount.id,
          debit: po.sgstTotal,
          credit: 0,
          narration: `SGST Input Tax Credit on ${billNumber}`,
          supplierId: po.supplierId,
          projectId: po.projectId || undefined,
        });
      }
    }

    journalLines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: po.totalAmount,
      narration: `Creditor Payable for Bill ${billNumber}: ${po.supplier.name}`,
      supplierId: po.supplierId,
      projectId: po.projectId || undefined,
    });

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.PURCHASE,
      financialYearId: fy.id,
      entryNumber: billNumber,
      date: new Date(),
      narration: `Purchase Bill ${billNumber} from PO ${po.poNumber}`,
      referenceNumber: po.poNumber,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Create Purchase Bill
    const purchaseBill = await prisma.purchaseBill.create({
      data: {
        billNumber,
        vendorInvoiceNumber: po.poNumber,
        date: new Date(),
        dueDate: po.expectedDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        supplierId: po.supplierId,
        projectId: po.projectId,
        financialYearId: fy.id,
        purchaseOrderId: po.id,
        subTotal: po.subTotal,
        cgstTotal: po.cgstTotal,
        sgstTotal: po.sgstTotal,
        igstTotal: po.igstTotal,
        totalAmount: po.totalAmount,
        amountPaid: 0,
        balanceDue: po.totalAmount,
        status: "UNPAID",
        journalEntryId: journalEntry.id,
        items: {
          create: po.items.map((it) => ({
            description: it.description,
            hsnSacCode: it.hsnSacCode,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            taxableAmount: it.taxableAmount,
            gstRate: it.gstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
    });

    // Update PO
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "BILLED",
        convertedBillId: purchaseBill.id,
      },
    });

    // Update Supplier outstanding balance
    await prisma.supplier.update({
      where: { id: po.supplierId },
      data: {
        outstandingBalance: {
          increment: po.totalAmount,
        },
      },
    });

    return NextResponse.json({ success: true, bill: purchaseBill });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
