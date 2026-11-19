import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const bills = await prisma.purchaseBill.findMany({
      where,
      include: {
        supplier: true,
        project: true,
        items: true,
        payments: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, bills });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierId,
      projectId,
      vendorInvoiceNumber,
      date,
      dueDate,
      destination = "INVENTORY", // "INVENTORY" | "PROJECT"
      notes,
      items = [],
    } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Supplier and Line Items are required." }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts
    const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } }); // Accounts Payable
    const targetDebitAccount =
      destination === "INVENTORY"
        ? (await prisma.account.findUnique({ where: { code: "1050" } })) || (await prisma.account.findUniqueOrThrow({ where: { code: "5010" } }))
        : await prisma.account.findUniqueOrThrow({ where: { code: "5010" } });

    const cgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1060" } });
    const sgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1061" } });
    const igstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1062" } });

    const isInterState = supplier.stateCode !== COMPANY_GST_STATE_CODE;
    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);

    const processedItems = items.map((it: any) => {
      const qty = toDecimal(it.quantity || 1);
      const price = toDecimal(it.unitPrice || 0);
      const gstRate = toDecimal(it.gstRate || 18);
      const taxable = qty.times(price);

      let cgst = new Decimal(0);
      let sgst = new Decimal(0);
      let igst = new Decimal(0);

      if (isInterState) {
        igst = taxable.times(gstRate).dividedBy(100);
      } else {
        const halfRate = gstRate.dividedBy(2);
        cgst = taxable.times(halfRate).dividedBy(100);
        sgst = taxable.times(halfRate).dividedBy(100);
      }

      const lineTotal = taxable.plus(cgst).plus(sgst).plus(igst);

      subTotal = subTotal.plus(taxable);
      cgstTotal = cgstTotal.plus(cgst);
      sgstTotal = sgstTotal.plus(sgst);
      igstTotal = igstTotal.plus(igst);
      grandTotal = grandTotal.plus(lineTotal);

      return {
        description: it.description,
        hsnSacCode: it.hsnSacCode || "7210",
        quantity: qty,
        unit: it.unit || "SQFT",
        unitPrice: price,
        taxableAmount: taxable,
        gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
        materialId: it.materialId || null,
      };
    });

    const voucherInfo = await getNextVoucherNumber(fy.id, "PURCHASE_BILL");
    const billNumber = voucherInfo.voucherNumber;

    // Double-Entry Journal Lines
    const journalLines: any[] = [
      {
        accountId: targetDebitAccount.id,
        debit: subTotal,
        credit: 0,
        narration: `Material Purchase on Bill ${billNumber} (${vendorInvoiceNumber || "Direct"})`,
        supplierId: supplier.id,
        projectId: projectId || undefined,
      },
    ];

    if (isInterState) {
      if (igstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: igstItcAccount.id,
          debit: igstTotal,
          credit: 0,
          narration: `IGST Input Tax Credit on ${billNumber}`,
          supplierId: supplier.id,
          projectId: projectId || undefined,
        });
      }
    } else {
      if (cgstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: cgstItcAccount.id,
          debit: cgstTotal,
          credit: 0,
          narration: `CGST Input Tax Credit on ${billNumber}`,
          supplierId: supplier.id,
          projectId: projectId || undefined,
        });
      }
      if (sgstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: sgstItcAccount.id,
          debit: sgstTotal,
          credit: 0,
          narration: `SGST Input Tax Credit on ${billNumber}`,
          supplierId: supplier.id,
          projectId: projectId || undefined,
        });
      }
    }

    journalLines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: grandTotal,
      narration: `Creditor Payable for Bill ${billNumber}: ${supplier.name}`,
      supplierId: supplier.id,
      projectId: projectId || undefined,
    });

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.PURCHASE,
      financialYearId: fy.id,
      entryNumber: billNumber,
      date: date ? new Date(date) : new Date(),
      narration: `Purchase Bill ${billNumber}: ${supplier.name} - ${vendorInvoiceNumber || ""}`,
      referenceNumber: vendorInvoiceNumber || undefined,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    const bill = await prisma.purchaseBill.create({
      data: {
        billNumber,
        vendorInvoiceNumber: vendorInvoiceNumber || null,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        supplierId: supplier.id,
        projectId: projectId || null,
        financialYearId: fy.id,
        subTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        totalAmount: grandTotal,
        amountPaid: 0,
        balanceDue: grandTotal,
        status: "UNPAID",
        journalEntryId: journalEntry.id,
        items: {
          create: processedItems.map((it: any) => ({
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
      include: {
        supplier: true,
        project: true,
        items: true,
      },
    });

    // Update Vendor outstanding balance
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        outstandingBalance: {
          increment: grandTotal,
        },
      },
    });

    // If destination is INVENTORY, update MaterialItem stock and log movement
    if (destination === "INVENTORY") {
      for (const it of processedItems) {
        if (it.materialId) {
          await prisma.materialItem.update({
            where: { id: it.materialId },
            data: {
              currentStock: { increment: it.quantity },
              unitCost: it.unitPrice,
            },
          });
          const mCount = await prisma.materialStockMovement.count();
          await prisma.materialStockMovement.create({
            data: {
              movementNumber: `STK-IN-${String(mCount + 1).padStart(4, "0")}`,
              materialId: it.materialId,
              movementType: "STOCK_IN",
              quantity: it.quantity,
              unitCost: it.unitPrice,
              totalValue: it.taxableAmount,
              supplierId: supplier.id,
              referenceNo: billNumber,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, bill });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
