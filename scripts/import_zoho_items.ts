import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(content: string) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCurrency(val: any): string {
  if (val === undefined || val === null) return '0.00';
  const str = String(val);
  const cleaned = str.replace(/INR/gi, '').replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

function inferCategory(name: string, productType: string): string {
  const n = name.toUpperCase();
  if (
    productType === 'service' ||
    n.includes('CHARGES') ||
    n.includes('LABOUR') ||
    n.includes('FREIGHT') ||
    n.includes('TRANSPORT')
  ) {
    return 'SERVICE';
  }
  if (n.includes('TILE') || n.includes('RIDGE') || n.includes('HIP') || n.includes('APEX')) {
    return 'TILES';
  }
  if (
    n.includes('PIPE') ||
    n.includes('BEAM') ||
    n.includes('ANGLE') ||
    n.includes('FLAT') ||
    n.includes('PLATE') ||
    n.includes('ISMB') ||
    n.includes('JOIST') ||
    n.includes('CHANNEL') ||
    n.includes('TMT')
  ) {
    return 'STEEL';
  }
  if (
    n.includes('SHEET') ||
    n.includes('DECKING') ||
    n.includes('PUFF') ||
    n.includes('PANEL') ||
    n.includes('POLYCARBONATE')
  ) {
    return 'SHEETS';
  }
  if (
    n.includes('SCREW') ||
    n.includes('BOLT') ||
    n.includes('HOOK') ||
    n.includes('CHAIN') ||
    n.includes('CLAMP') ||
    n.includes('NAIL')
  ) {
    return 'FASTENERS';
  }
  if (
    n.includes('PRIMER') ||
    n.includes('PAINT') ||
    n.includes('THINNER') ||
    n.includes('RESIN') ||
    n.includes('OXIDE') ||
    n.includes('SILICONE') ||
    n.includes('PASTE')
  ) {
    return 'COATINGS';
  }
  return 'HARDWARE_MATERIAL';
}

async function main() {
  console.log('--- Starting Zoho Books Items Catalog Import (Exact 290 Items) ---');

  const csvPath = path.join(process.cwd(), 'data', 'zoho_items.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(fileContent);
  console.log(`Parsed exactly ${records.length} records with preserved string IDs from ${csvPath}.`);

  // 1. Update CompanySettings logoUrl and official info
  await prisma.companySettings.upsert({
    where: { id: 'sr_company_config' },
    update: {
      logoUrl: '/images/standard-roofs-logo.png',
      companyName: 'Standard Roofs',
      gstin: '33AEWFS5187G1ZD',
      address: '144/A, Vellakkal Medu, Villarasampatti, Nasiyanur(Post), Erode, Tamil Nadu-638107.',
      phone: '8608475767',
      email: 'info@standardroofs.in',
      bankName: 'ICICI Bank',
      bankAccountNo: '155205003161',
      bankBranch: 'Erode, Tamil Nadu',
      bankIfsc: 'ICIC0001552',
    },
    create: {
      id: 'sr_company_config',
      logoUrl: '/images/standard-roofs-logo.png',
      companyName: 'Standard Roofs',
      gstin: '33AEWFS5187G1ZD',
      address: '144/A, Vellakkal Medu, Villarasampatti, Nasiyanur(Post), Erode, Tamil Nadu-638107.',
      phone: '8608475767',
      email: 'info@standardroofs.in',
      bankName: 'ICICI Bank',
      bankAccountNo: '155205003161',
      bankBranch: 'Erode, Tamil Nadu',
      bankIfsc: 'ICIC0001552',
      invoiceNextNo: 33,
    },
  });
  console.log('✓ CompanySettings verified.');

  // Clean previous partial ZOHO- and MAT-369692 items if any
  await prisma.roofingPriceItem.deleteMany({
    where: { itemCode: { startsWith: 'ZOHO-' } },
  });
  await prisma.materialItem.deleteMany({
    where: { itemCode: { startsWith: 'MAT-369692' } },
  });

  let importedCatalog = 0;
  let importedMaterials = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const itemId = r['Item ID'] || `ITEM-${i + 1}`;
    const name = r['Item Name'] || `Item ${i + 1}`;
    const hsn = r['HSN/SAC'] || '';
    const unit = r['Usage unit'] || r['Unit Name'] || 'nos';
    const sellRate = parseCurrency(r['Rate']);
    const buyRate = parseCurrency(r['Purchase Rate']);
    const productType = r['Product Type']?.toLowerCase() === 'service' ? 'service' : 'goods';
    const taxRate = parseFloat(r['Intra State Tax Rate'] || '18.00') || 18.00;
    const desc = r['Description'] || r['Product Name'] || null;
    const category = inferCategory(name, productType);

    const catalogCode = `ZOHO-${itemId}`;
    const matCode = `MAT-${itemId}`;

    // Upsert into RoofingPriceItem (Searchable Price & Item Catalog)
    await prisma.roofingPriceItem.upsert({
      where: { itemCode: catalogCode },
      update: {
        name,
        category,
        hsnSacCode: hsn,
        unit,
        defaultRate: sellRate,
        purchaseRate: buyRate,
        gstRate: taxRate.toFixed(2),
        productType,
        description: desc,
      },
      create: {
        itemCode: catalogCode,
        name,
        category,
        roofType: 'PEB',
        hsnSacCode: hsn,
        unit,
        defaultRate: sellRate,
        purchaseRate: buyRate,
        gstRate: taxRate.toFixed(2),
        productType,
        description: desc,
      },
    });
    importedCatalog++;

    // Upsert into MaterialItem (Stock & Inventory)
    await prisma.materialItem.upsert({
      where: { itemCode: matCode },
      update: {
        name,
        category,
        unit,
        unitCost: buyRate,
        rate: sellRate,
        hsnSacCode: hsn,
        productType,
      },
      create: {
        itemCode: matCode,
        sNo: i + 1,
        name,
        category,
        unit,
        currentStock: '0.00',
        minAlertStock: '10.00',
        unitCost: buyRate,
        rate: sellRate,
        hsnSacCode: hsn,
        productType,
        yardLocation: 'Erode Main Yard',
      },
    });
    importedMaterials++;
  }

  console.log(`✓ Successfully upserted ${importedCatalog} items into RoofingPriceItem Catalog.`);
  console.log(`✓ Successfully upserted ${importedMaterials} items into MaterialItem Inventory.`);

  const zohoCatalogCount = await prisma.roofingPriceItem.count({
    where: { itemCode: { startsWith: 'ZOHO-' } },
  });
  const zohoMaterialCount = await prisma.materialItem.count({
    where: { itemCode: { startsWith: 'MAT-369692' } },
  });

  console.log(`Zoho Items in DB: ${zohoCatalogCount} RoofingPriceItems, ${zohoMaterialCount} MaterialItems.`);
}

main()
  .catch((e) => {
    console.error('Import error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
