import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { getStorageService } from "@/lib/storage";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET() {
  try {
    const purchaseBills = await prisma.purchaseBill.findMany({
      include: {
        supplier: true,
        project: { select: { id: true, code: true, name: true } },
        items: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, purchaseBills });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const supplierId = formData.get("supplierId") as string;
    const projectId = (formData.get("projectId") as string) || null;
    const vendorInvoiceNumber = formData.get("vendorInvoiceNumber") as string;
    const dateStr = formData.get("date") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const purchaseAccountId = (formData.get("purchaseAccountId") as string) || null; // 5010 Steel or 5020 Sheets
    const itemsJson = formData.get("items") as string;
    const receiptFile = formData.get("receipt") as File | null;

    if (!supplierId || !itemsJson) {
      return NextResponse.json({ success: false, error: "Supplier and Line Items are required." }, { status: 400 });
    }

    const items = JSON.parse(itemsJson);
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one purchase item is required." }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts
    const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } }); // Accounts Payable
    const steelAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5010" } }); // Steel Purchase
    const cgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1060" } }); // CGST ITC
    const sgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1061" } }); // SGST ITC
    const igstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1062" } }); // IGST ITC

    const targetExpenseAccountId = purchaseAccountId || steelAccount.id;

    // Handle receipt file upload if provided
    let receiptUrl: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const storage = getStorageService();
      const uploadRes = await storage.uploadFile({
        financialYear: fy.name,
        module: "vouchers",
        filename: receiptFile.name,
        buffer,
        contentType: receiptFile.type,
      });
      receiptUrl = uploadRes.url;
    }

    // Process line items & GST Input
    const isInterState = supplier.stateCode !== COMPANY_GST_STATE_CODE;
    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);

    const processedItems = items.map((it: any) => {
      const qty = toDecimal(it.quantity || 1);
      const price = toDecimal(it.unitPrice || 0);
      const rate = toDecimal(it.gstRate || 18);
      const taxable = qty.times(price);
      const gstRes = calculateGST(taxable, supplier.stateCode, rate);

      subTotal = subTotal.plus(taxable);
      cgstTotal = cgstTotal.plus(gstRes.cgstAmount);
      sgstTotal = sgstTotal.plus(gstRes.sgstAmount);
      igstTotal = igstTotal.plus(gstRes.igstAmount);
      grandTotal = grandTotal.plus(gstRes.totalAmount);

      return {
        description: it.description,
        hsnSacCode: it.hsnSacCode || "7210",
        quantity: qty.toFixed(2),
        unit: it.unit || "TON",
        unitPrice: price.toFixed(2),
        taxableAmount: taxable.toFixed(2),
        gstRate: rate.toFixed(2),
        cgstAmount: gstRes.cgstAmount.toFixed(2),
        sgstAmount: gstRes.sgstAmount.toFixed(2),
        igstAmount: gstRes.igstAmount.toFixed(2),
        totalAmount: gstRes.totalAmount.toFixed(2),
      };
    });

    const voucherInfo = await getNextVoucherNumber(fy.id, "PURCHASE_BILL");
    const billNumber = voucherInfo.voucherNumber;

    // Prepare Double-Entry Journal Lines
    const journalLines: any[] = [
      // Debit: Material Purchases Expense
      {
        accountId: targetExpenseAccountId,
        debit: subTotal,
        credit: 0,
        narration: `Material Purchase on Bill ${billNumber} (${vendorInvoiceNumber || "Direct"})`,
        supplierId: supplier.id,
        projectId: projectId || undefined,
      },
    ];

    // Debit: Input Tax Credit (ITC)
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

    // Credit: Accounts Payable Creditors for full invoice amount
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
      date: dateStr ? new Date(dateStr) : new Date(),
      narration: `Purchase Bill ${billNumber}: ${supplier.name} - ${vendorInvoiceNumber || ""}`,
      referenceNumber: vendorInvoiceNumber || undefined,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Create Purchase Bill
    const purchaseBill = await prisma.purchaseBill.create({
      data: {
        billNumber,
        vendorInvoiceNumber: vendorInvoiceNumber || null,
        date: dateStr ? new Date(dateStr) : new Date(),
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        supplierId: supplier.id,
        projectId,
        financialYearId: fy.id,
        subTotal: subTotal.toFixed(2),
        cgstTotal: cgstTotal.toFixed(2),
        sgstTotal: sgstTotal.toFixed(2),
        igstTotal: igstTotal.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
        balanceDue: grandTotal.toFixed(2),
        status: "UNPAID",
        receiptUrl,
        journalEntryId: journalEntry.id,
        items: {
          create: processedItems,
        },
      },
      include: { supplier: true, items: true },
    });

    // Update Supplier balance
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        outstandingBalance: toDecimal(supplier.outstandingBalance).plus(grandTotal).toFixed(2),
      },
    });

    return NextResponse.json({ success: true, purchaseBill, journalEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
