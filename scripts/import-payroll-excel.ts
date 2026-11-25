import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { parseAndImportPayrollWorkbook } from "../src/lib/payrollExcelParser";

async function main() {
  const prisma = new PrismaClient();
  try {
    const filePath = path.resolve(process.cwd(), "imports", "Salary and Wages reports .xlsx");
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found at ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    console.log(`[PayrollImport] Reading ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)...`);

    const result = await parseAndImportPayrollWorkbook(buffer, prisma);
    console.log(`\n[PayrollImport] Completed!`);
    console.log(`  Runs Imported : ${result.runsImported}`);
    console.log(`  Items Imported: ${result.itemsImported}\n`);
    result.summary.forEach((line) => console.log(`  - ${line}`));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[PayrollImport] Error:", err);
  process.exit(1);
});
