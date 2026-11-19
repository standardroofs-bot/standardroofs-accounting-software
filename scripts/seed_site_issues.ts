import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const currentCount = await prisma.siteMaterialIssue.count();
  console.log(`Current site material issues: ${currentCount}`);

  if (currentCount > 0) {
    console.log("Site issues already seeded.");
    return;
  }

  const manifestPath = path.join(__dirname, "extracted_data.json");
  if (!fs.existsSync(manifestPath)) {
    console.log("Manifest not found.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const stockOut = data.stock_out || [];

  console.log(`Extracted stock_out rows: ${stockOut.length}`);

  // Map first 50 unique rows into SiteMaterialIssue
  let created = 0;
  for (const row of stockOut.slice(0, 50)) {
    // Row might have columns: A: Date, B: Site/Particulars, C: Qty, D: Team, etc.
    const site = row.B || row.C || row.D || "SSM School_Site";
    const product = row.E || row.B || '5" Cutting Wheel';
    const qty = parseFloat(String(row.F || row.C || "5").replace(/[^0-9.]/g, "")) || 5;
    const team = row.D || row.A || "SRM01";

    if (!product || product.length < 2) continue;

    await prisma.siteMaterialIssue.create({
      data: {
        date: new Date(),
        team: typeof team === "string" && team.startsWith("SRM") ? team : "SRM01",
        siteName: typeof site === "string" ? site.slice(0, 50) : "Project Site",
        productName: typeof product === "string" ? product.slice(0, 60) : 'Cutting Wheel 5"',
        quantity: qty,
        isReturnable: false,
        issuedBy: "Gowri Sankar",
        approvedBy: "Siva Kumar",
        condition: "Good",
        notes: "Excel historical site issue register",
      },
    });
    created++;
  }

  console.log(`Seeded ${created} initial site material issues.`);
}

main().then(() => prisma.$disconnect()).catch(console.error);
