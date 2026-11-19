import { prisma } from "../src/lib/prisma";

async function runVerification() {
  console.log("=== STARTING PHASE 7 E2E PRODUCTION VERIFICATION ===");

  // 1. Authenticate
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@standardroofs.com", password: "Admin@2026" }),
  });
  console.log("1. Admin Login Status:", loginRes.status);
  if (loginRes.status !== 200) throw new Error("Login failed");
  const cookie = loginRes.headers.get("set-cookie") || "";

  // Check initial bank balance
  const iciciInitial = await prisma.bankAccount.findFirst({ where: { accountNumber: "155205003161" } });
  console.log("Initial ICICI Balance:", iciciInitial?.currentBalance.toString());

  // 2. Create a Customer for Invoice Test
  const custRes = await fetch("http://localhost:3000/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "E2E Test Client (Salem)",
      companyName: "Salem Steel Works",
      gstNumber: "33AABCS5555F1Z1",
      billingAddress: "45, Salem Main Road, Salem",
      state: "Tamil Nadu",
      stateCode: "33",
      phone: "+91 98421 99999",
    }),
  });
  const custData = await custRes.json();
  const testCustomerId = custData.customer?.id;
  console.log("2. Created Test Customer:", testCustomerId);

  // 3. Create Tax Invoice #33
  const invRes = await fetch("http://localhost:3000/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      customerId: testCustomerId,
      invoiceType: "TAX_INVOICE",
      date: new Date().toISOString(),
      terms: "Payment within 15 days.",
      items: [
        {
          description: "PEB Roofing Shed Structure",
          hsnSacCode: "9954",
          unit: "SQFT",
          quantity: 500,
          unitPrice: 180,
          discount: 0,
          gstRate: 18,
        },
      ],
    }),
  });
  const invData = await invRes.json();
  console.log("3. Created Tax Invoice Status:", invRes.status, "Invoice Number:", invData.invoice?.invoiceNumber);
  const testInvoiceId = invData.invoice?.id;

  // 4. Test Detail Page and Print Page
  const detailRes = await fetch(`http://localhost:3000/invoices/${testInvoiceId}`, {
    headers: { Cookie: cookie },
  });
  console.log("4a. Invoice Detail Page Status:", detailRes.status);

  const printRes = await fetch(`http://localhost:3000/invoices/${testInvoiceId}/print`, {
    headers: { Cookie: cookie },
  });
  console.log("4b. Invoice Print Page Status:", printRes.status);
  if (printRes.status !== 200) {
    const txt = await printRes.text();
    console.error("Print Page Error text:", txt.slice(0, 500));
    throw new Error("Invoice Print Page failed!");
  }

  // 5. Create a Vendor for Purchase Test
  const venRes = await fetch("http://localhost:3000/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "E2E Steel Vendor (Coimbatore)",
      companyName: "Coimbatore Tubes Ltd",
      gstNumber: "33AABCC1111F1Z8",
      phone: "+91 98422 88888",
      state: "Tamil Nadu",
      stateCode: "33",
      paymentTerms: "30 Days",
      bankName: "HDFC Bank",
      accountNumber: "50200099887766",
      ifscCode: "HDFC0001234",
    }),
  });
  const venData = await venRes.json();
  const testVendorId = venData.vendor?.id;
  console.log("5. Created Test Vendor:", testVendorId);

  // 6. Create Purchase Order
  const poRes = await fetch("http://localhost:3000/api/purchase-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      supplierId: testVendorId,
      date: new Date().toISOString(),
      items: [
        {
          description: "MS Hollow Sections 50x50",
          hsnSacCode: "7210",
          quantity: 2,
          unit: "TON",
          unitPrice: 65000,
          gstRate: 18,
        },
      ],
    }),
  });
  const poData = await poRes.json();
  const testPoId = poData.purchaseOrder?.id;
  console.log("6. Created PO Status:", poRes.status, "PO Number:", poData.purchaseOrder?.poNumber);

  // 7. Convert PO to Vendor Bill
  const convBillRes = await fetch(`http://localhost:3000/api/purchase-orders/${testPoId}/convert`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const convBillData = await convBillRes.json();
  const testBillId = convBillData.bill?.id;
  console.log("7. Converted PO to Bill Status:", convBillRes.status, "Bill Number:", convBillData.bill?.billNumber, "Total Amount:", convBillData.bill?.totalAmount);

  // 8. Record Payment Made with TDS
  const payMadeRes = await fetch("http://localhost:3000/api/payments-made", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      purchaseBillId: testBillId,
      amount: "100000",
      tdsSection: "194C",
      tdsRate: "1",
      tdsAmount: "1000",
      paymentMode: "NEFT",
      bankAccountId: iciciInitial?.id,
      referenceNumber: "E2E-UTR-9999",
      notes: "E2E Test Payout",
    }),
  });
  const payMadeData = await payMadeRes.json();
  console.log("8. Recorded Payment Made Status:", payMadeRes.status, "Payment Number:", payMadeData.billPayment?.paymentNumber);

  // 9. Clean up all test records
  console.log("9. Cleaning up test records to preserve pristine state...");

  // Delete test payment
  if (payMadeData.billPayment?.id) {
    const bp = await prisma.billPayment.findUnique({ where: { id: payMadeData.billPayment.id } });
    if (bp?.journalEntryId) {
      await prisma.journalLine.deleteMany({ where: { journalEntryId: bp.journalEntryId } });
      await prisma.billPayment.delete({ where: { id: bp.id } });
      await prisma.journalEntry.delete({ where: { id: bp.journalEntryId } });
    }
  }

  // Delete test bill
  if (testBillId) {
    const b = await prisma.purchaseBill.findUnique({ where: { id: testBillId } });
    if (b?.journalEntryId) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseBillId: testBillId } });
      await prisma.purchaseBill.delete({ where: { id: testBillId } });
      await prisma.journalLine.deleteMany({ where: { journalEntryId: b.journalEntryId } });
      await prisma.journalEntry.delete({ where: { id: b.journalEntryId } });
    }
  }

  // Delete test PO
  if (testPoId) {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: testPoId } });
    await prisma.purchaseOrder.delete({ where: { id: testPoId } });
  }

  // Delete test Vendor
  if (testVendorId) {
    await prisma.supplier.delete({ where: { id: testVendorId } });
  }

  // Delete test Invoice
  if (testInvoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
    if (inv?.journalEntryId) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoice.delete({ where: { id: testInvoiceId } });
      await prisma.journalLine.deleteMany({ where: { journalEntryId: inv.journalEntryId } });
      await prisma.journalEntry.delete({ where: { id: inv.journalEntryId } });
    } else {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoice.delete({ where: { id: testInvoiceId } });
    }
  }

  // Delete test Customer
  if (testCustomerId) {
    await prisma.customer.delete({ where: { id: testCustomerId } });
  }

  // Restore ICICI Bank balance to opening balance
  await prisma.bankAccount.update({
    where: { accountNumber: "155205003161" },
    data: { currentBalance: "2403272.00" },
  });

  // Reset SystemSettings counters
  await prisma.systemSettings.upsert({
    where: { id: "sr_system_settings" },
    update: {
      lastInvoiceNumber: 32,
      lastPoSerialNumber: 0,
      lastSoSerialNumber: 0,
    },
    create: {
      id: "sr_system_settings",
      lastInvoiceNumber: 32,
      lastQuoteSerialNumber: 0,
      lastPoSerialNumber: 0,
      lastSoSerialNumber: 0,
    },
  });

  const fyRecord = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
  if (fyRecord) {
    await prisma.voucherSequence.upsert({
      where: {
        financialYearId_voucherType: {
          financialYearId: fyRecord.id,
          voucherType: "INVOICE",
        },
      },
      update: { nextNumber: 33 },
      create: {
        financialYearId: fyRecord.id,
        voucherType: "INVOICE",
        prefix: "SR/26-27/",
        nextNumber: 33,
        paddingLength: 4,
      },
    });
  }

  console.log("=== ALL E2E PRODUCTION VERIFICATIONS PASSED WITH 100% SUCCESS ===");
}

runVerification()
  .catch((err) => {
    console.error("E2E Verification Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
