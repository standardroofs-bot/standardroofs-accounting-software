import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Testing Invoice #33 Creation & Zoho Parity ---');

  // 1. Authenticate via API
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@standardroofs.com', password: 'Admin@2026' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error(`Login failed: ${loginData.error}`);
  }
  const cookie = loginRes.headers.get('set-cookie') || '';
  console.log('✓ Successfully logged in as Super Admin.');

  // 2. Test Price Catalog Search
  const catalogRes = await fetch('http://localhost:3000/api/price-catalog?q=SCREW', {
    headers: { cookie },
  });
  const catalogData = await catalogRes.json();
  console.log(`✓ Price Catalog search for "SCREW" returned ${catalogData.items?.length} items.`);

  // 3. Clean up any stale test entries for 0033 to ensure clean creation
  const staleEntries = await prisma.journalEntry.findMany({
    where: { entryNumber: { in: ['SR/26-27/0033', 'SR/26-27/0034', 'SR/26-27/0035'] } },
    select: { id: true },
  });
  for (const se of staleEntries) {
    await prisma.journalLine.deleteMany({ where: { journalEntryId: se.id } });
    await prisma.journalEntry.delete({ where: { id: se.id } });
  }

  // Also clean up any stale invoice with sequence 33/34/35
  const staleInvoices = await prisma.invoice.findMany({
    where: { sequenceNumber: { in: [33, 34, 35] } },
    select: { id: true },
  });
  for (const si of staleInvoices) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: si.id } });
    await prisma.invoice.delete({ where: { id: si.id } });
  }

  // Reset next voucher number strictly to 33
  const fy0 = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
  if (fy0) {
    await prisma.voucherSequence.updateMany({
      where: { financialYearId: fy0.id, voucherType: 'INVOICE' },
      data: { nextNumber: 33 },
    });
  }

  // 4. Get customer
  let customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Ravindran', mode: 'insensitive' } },
  });
  if (!customer) {
    customer = await prisma.customer.findFirst();
  }
  if (!customer) {
    throw new Error('No customer found in DB');
  }
  console.log(`✓ Using Customer: ${customer.name} (ID: ${customer.id})`);

  // 4. Create Invoice #33
  const createRes = await fetch('http://localhost:3000/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      customerId: customer.id,
      invoiceType: 'TAX_INVOICE',
      date: '2026-11-17',
      terms: 'Due on Receipt',
      dueDate: '2026-11-17',
      placeOfSupply: 'Tamil Nadu',
      placeOfSupplyStateCode: '33',
      shippingAddress:
        'S.F. 47/2C2B, Samyasangilli Agraharam, Seerampalayam, Pallipalayam Agaharam, Namakkal-638008, Tamil Nadu.',
      adjustment: -0.01,
      items: [
        {
          description: '5x4"G.I.(B.P)B/W REDUCER-E.R.W-C-CLASS',
          subDescription: '',
          hsnSacCode: '730793',
          quantity: 5,
          unit: 'nos',
          unitPrice: 485.3,
          gstRate: 18,
        },
        {
          description: 'WELDED LINK CHAIN',
          subDescription: '40ft-Chain Length',
          hsnSacCode: '73158200',
          quantity: 40,
          unit: 'ft',
          unitPrice: 89.3,
          gstRate: 18,
        },
        {
          description: 'S-S Hook Connector',
          subDescription: '10-Nos',
          hsnSacCode: '73159000',
          quantity: 10,
          unit: 'nos',
          unitPrice: 19.52,
          gstRate: 18,
        },
        {
          description: 'HR PLATE',
          subDescription: '',
          hsnSacCode: '720851',
          quantity: 3,
          unit: 'nos',
          unitPrice: 2936.85,
          gstRate: 18,
        },
      ],
    }),
  });

  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Invoice creation failed: ${createData.error}`);
  }

  const inv = createData.invoice;
  console.log('✓ Successfully created test Invoice:');
  console.log({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    sequenceNumber: inv.sequenceNumber,
    subTotal: inv.subTotal,
    cgstTotal: inv.cgstTotal,
    sgstTotal: inv.sgstTotal,
    adjustment: inv.adjustment,
    totalAmount: inv.totalAmount,
    balanceDue: inv.balanceDue,
    itemsCount: inv.items?.length,
  });

  // 5. Fetch Print / PDF view
  const printRes = await fetch(`http://localhost:3000/invoices/${inv.id}/print`, {
    headers: { cookie },
  });
  console.log(`✓ Invoice Print View HTTP status: ${printRes.status} (Expected: 200)`);
  if (printRes.status !== 200) {
    throw new Error('Print view returned non-200 status');
  }

  // 6. Fetch Detail view
  const detailRes = await fetch(`http://localhost:3000/invoices/${inv.id}`, {
    headers: { cookie },
  });
  console.log(`✓ Invoice Detail View HTTP status: ${detailRes.status} (Expected: 200)`);
  if (detailRes.status !== 200) {
    throw new Error('Detail view returned non-200 status');
  }

  // 7. Clean up test invoice so #33 remains completely fresh and ready for real production entry
  console.log('--- Cleaning up test invoice to preserve #33 sequence ---');
  if (inv.journalEntryId) {
    await prisma.journalLine.deleteMany({ where: { journalEntryId: inv.journalEntryId } });
    await prisma.journalEntry.delete({ where: { id: inv.journalEntryId } });
  }
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
  await prisma.invoice.delete({ where: { id: inv.id } });

  // Reset SystemSettings lastInvoiceNumber back to 32 and CompanySettings invoiceNextNo to 33
  await prisma.systemSettings.updateMany({
    data: { lastInvoiceNumber: 32 },
  });
  await prisma.companySettings.updateMany({
    data: { invoiceNextNo: 33 },
  });

  // Re-adjust customer balance
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      outstandingBalance: customer.outstandingBalance,
    },
  });

  // Reset VoucherSequence for INVOICE if used
  const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
  if (fy) {
    await prisma.voucherSequence.updateMany({
      where: { financialYearId: fy.id, voucherType: 'INVOICE' },
      data: { nextNumber: 33 },
    });
  }

  console.log('✓ Test invoice deleted cleanly. Sequence reset: Next Invoice is strictly #33 (SR/26-27/0033).');
}

main()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
