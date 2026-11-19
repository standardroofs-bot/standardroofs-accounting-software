import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================");
  console.log("SEEDING REAL EXCEL DATA WITH IMAGES INTO DB");
  console.log("==========================================");

  const manifestPath = path.join(__dirname, "extracted_data.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}. Run extract_all_media.py first.`);
  }

  const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  // 1. Seed Machines
  console.log(`Seeding ${data.machines.length} Machines...`);
  for (let idx = 0; idx < data.machines.length; idx++) {
    const m = data.machines[idx];
    const sNo = idx + 1;
    const code = `SRM-${String(sNo).padStart(3, "0")}`;
    let category = "Power Tools";
    const nameLower = m.name.toLowerCase();
    if (nameLower.includes("vehicle") || nameLower.includes("xl")) category = "Heavy Vehicles";
    else if (nameLower.includes("bit") || nameLower.includes("scale") || nameLower.includes("blade") || nameLower.includes("tube") || nameLower.includes("tape")) category = "Bits & Scales";
    else if (nameLower.includes("bag") || nameLower.includes("shirt") || nameLower.includes("plate")) category = "Bags & Safety";

    await prisma.machineAsset.upsert({
      where: { assetCode: code },
      update: {
        sNo: sNo,
        name: m.name,
        category,
        officeCount: m.officeCount,
        srm01Count: m.srm01Count,
        srm02Count: m.srm02Count,
        srm03Count: m.srm03Count,
        srm04Count: m.srm04Count,
        srm05Count: m.srm05Count,
        srm06Count: m.srm06Count,
        spareCount: m.spareCount,
        serviceCount: m.serviceCount,
        scrapCount: m.scrapCount,
        totalCount: m.totalCount,
        srFinalCount: m.srFinalCount,
        notes: m.notes,
        imageUrl: m.imageUrl,
      },
      create: {
        assetCode: code,
        sNo: sNo,
        name: m.name,
        category,
        officeCount: m.officeCount,
        srm01Count: m.srm01Count,
        srm02Count: m.srm02Count,
        srm03Count: m.srm03Count,
        srm04Count: m.srm04Count,
        srm05Count: m.srm05Count,
        srm06Count: m.srm06Count,
        spareCount: m.spareCount,
        serviceCount: m.serviceCount,
        scrapCount: m.scrapCount,
        totalCount: m.totalCount,
        srFinalCount: m.srFinalCount,
        notes: m.notes,
        imageUrl: m.imageUrl,
      },
    });
  }
  console.log("Machines seeded successfully!");

  // 2. Seed Inventory Items
  console.log(`Seeding ${data.inventory.length} Inventory items...`);
  for (const inv of data.inventory) {
    const code = `MAT-${String(inv.sNo).padStart(3, "0")}-${inv.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X")}`;
    let unit = "Nos";
    const nameLower = inv.name.toLowerCase();
    if (nameLower.includes("wheel") || nameLower.includes("blade") || nameLower.includes("bit") || nameLower.includes("screw") || nameLower.includes("aani")) unit = "Nos";
    else if (nameLower.includes("rod") || nameLower.includes("wire")) unit = "Kg";
    else if (nameLower.includes("paint") || nameLower.includes("primer") || nameLower.includes("clear") || nameLower.includes("white")) unit = "Boxes";
    else if (nameLower.includes("tile")) unit = "Sq.Ft";

    await prisma.materialItem.upsert({
      where: { itemCode: code },
      update: {
        sNo: inv.sNo,
        name: inv.name,
        category: inv.category || "Consumables & Hardware",
        unit,
        currentStock: inv.availableStock,
        minAlertStock: inv.minQty || 5,
        rate: inv.rate || 0,
        unitCost: inv.rate || 0,
        imageUrl: inv.imageUrl,
      },
      create: {
        itemCode: code,
        sNo: inv.sNo,
        name: inv.name,
        category: inv.category || "Consumables & Hardware",
        unit,
        currentStock: inv.availableStock,
        minAlertStock: inv.minQty || 5,
        rate: inv.rate || 0,
        unitCost: inv.rate || 0,
        imageUrl: inv.imageUrl,
      },
    });
  }
  console.log("Inventory items seeded successfully!");

  // 3. Seed Tiles Inventory
  console.log(`Seeding ${data.tiles.length + data.godown.length} Tiles & Godown items...`);
  let tileIndex = 1;
  const processedTileNames = new Set<string>();

  for (const item of [...data.tiles, ...data.godown]) {
    const name = item.name;
    if (!name || processedTileNames.has(name.toLowerCase())) continue;
    processedTileNames.add(name.toLowerCase());

    const code = `TILE-${String(tileIndex++).padStart(3, "0")}`;
    let cat = "Kerala Clay Tiles";
    if (name.toLowerCase().includes("ceramic")) cat = "Ceramic Tiles";
    else if (name.toLowerCase().includes("monier")) cat = "Monier Concrete Tiles";
    else if (name.toLowerCase().includes("ceiling") || name.toLowerCase().includes("multiwood")) cat = "Ceiling & Decorative Tiles";

    const qty = parseFloat(String(item.qty || "0").replace(/[^0-9.]/g, "")) || 0;

    await prisma.tilesInventory.upsert({
      where: { tileCode: code },
      update: {
        tileName: name,
        category: cat,
        availableStock: qty,
        godownStock: qty,
      },
      create: {
        tileCode: code,
        tileName: name,
        category: cat,
        availableStock: qty,
        godownStock: qty,
      },
    });
  }
  console.log("Tiles Inventory seeded successfully!");

  // 4. Seed Pre-Dispatch Checklists
  console.log(`Seeding ${data.checklists.length} Checklist items...`);
  // Clear previous checklist items to prevent stale duplicates
  await prisma.preDispatchChecklist.deleteMany();

  const tamilToEnglishMap: Record<string, string> = {
    "மெஷின்": "Roofing Machine Set",
    "ஸ்க்ரூயிங் மெஷின்": "Battery Screwing Machine",
    "கட்டிங் மெஷின்": "Cutting Machine",
    "பெயர் பலகை": "Standard Roofs Name Plate",
    "ரிஜ் சீட்": "Ridge Sheet",
    "சிலிக்கான் க்ளியர்": "Silicon Clear Tube",
    "சிலிக்கான்": "Silicon Tube",
    "தூவானம்": "Flashing / Drip Sheet",
    "ரெடியுசர்": "Pipe Reducer",
    "ஸ்க்ரூ 1\"": "Screw 1 Inch",
    "ஸ்க்ரூ 2\"": "Screw 2 Inch",
    "ஸ்க்ரூ 3\"": "Screw 3 Inch",
    "வயர் 3:1": "Heavy Wire 3:1",
    "பெயிண்ட்": "Metal Primer & Paint",
    "5\" வால் கட்டர்": "5 Inch Wall Cutter",
    "டெஸ்டர், கட்டிங் பிளையர்": "Tester & Cutting Plier",
    "வெல்டிங் மெஷின்": "Inverter Welding Machine",
    "வெல்டிங் ராடு": "Welding Rod 2.5mm",
    "வெல்டிங் கிளாஸ் கருப்பு": "Welding Glass (Black)",
    "வெல்டிங் கிளாஸ் வெள்ளை": "Welding Glass (White)",
    "வெல்டிங் சுவிட்ச்": "Welding Switch Box",
    "பிரேக்கர் & டிரில்லிங்மெஷின்": "Breaker & Drilling Machine",
    "5\" கட்டிங் வீல்": "5 Inch Cutting Wheel",
    "14\" கட்டிங் வீல்": "14 Inch Cutting Wheel",
    "4\" கிரைண்டிங் வீல்": "4 Inch Grinding Wheel",
    "5\" கிரைண்டிங் வீல்": "5 Inch Grinding Wheel",
    "கார்பன்": "Machine Carbon Brush",
    "கிளவுஸ்": "Safety Hand Gloves",
    "சக் பிட்": "Chalk / Bit Set",
    "வெல்டிங் ஹோல்டர்": "Welding Holder Cable Set",
    "புல்லட் போல்ட்": "Bullet Anchor Bolt",
  };

  function cleanName(rawName: string): string {
    const trimmed = rawName.trim();
    if (tamilToEnglishMap[trimmed]) return tamilToEnglishMap[trimmed];
    // Strip non-ascii or transliterate
    return trimmed.replace(/[^\x00-\x7F]/g, "").trim() || "Roofing Tool";
  }

  for (const chk of data.checklists) {
    const englishName = cleanName(chk.itemName);
    await prisma.preDispatchChecklist.create({
      data: {
        checklistType: chk.checklistType,
        sNo: chk.sNo,
        itemName: englishName,
        standardQty: String(chk.standardQty || "1").replace(/[^\x00-\x7F]/g, "").trim() || "1",
        status: "VERIFIED",
        verifiedBy: "Gowri Sankar",
        verifiedAt: new Date(),
        imageUrl: chk.imageUrl,
      },
    });
  }
  console.log("Checklists seeded successfully!");

  console.log("==========================================");
  console.log("ALL REAL EXCEL DATA SEEDED PERFECTLY!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
