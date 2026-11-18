import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "customers";
    const action = (formData.get("action") as string) || "preview"; // preview or save

    if (!file) throw new Error("No Excel file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      throw new Error("Excel sheet contains no data rows.");
    }

    // Process & normalize rows based on type
    let validRows: any[] = [];
    let errors: string[] = [];

    if (type === "customers") {
      validRows = rawRows.map((r, i) => {
        const name = r["Name *"] || r["Name"] || r["Customer Name"];
        const phone = String(r["Mobile *"] || r["Mobile"] || r["Phone"] || "");
        const billingAddress = r["Billing Address *"] || r["Billing Address"] || r["Address"] || "Erode";
        const companyName = r["Company Name"] || null;
        const gstin = r["GSTIN (15 digits)"] || r["GSTIN"] || null;
        const stateCode = String(r["State Code (33 for TN)"] || r["State Code"] || "33");
        const creditDays = parseInt(r["Credit Days"]) || 30;
        const openingBalance = parseFloat(r["Opening Balance (₹)"] || r["Opening Balance"]) || 0;

        if (!name) errors.push(`Row ${i + 2}: Missing Customer Name`);

        return {
          name,
          companyName,
          phone,
          billingAddress,
          gstin,
          stateCode,
          creditDays,
          openingBalance,
        };
      });
    } else if (type === "suppliers") {
      validRows = rawRows.map((r, i) => {
        const name = r["Supplier Name *"] || r["Name"] || r["Supplier Name"];
        const companyName = r["Company Name"] || null;
        const gstNumber = r["GSTIN"] || r["GST"] || null;
        const phone = String(r["Phone"] || r["Mobile"] || "");
        const address = r["Address"] || null;
        const paymentTerms = r["Payment Terms"] || "30 Days";
        const accountNumber = String(r["Bank Account No"] || "");
        const ifscCode = r["IFSC Code"] || null;

        if (!name) errors.push(`Row ${i + 2}: Missing Supplier Name`);

        return {
          name,
          companyName,
          gstNumber,
          phone,
          address,
          paymentTerms,
          accountNumber,
          ifscCode,
        };
      });
    } else if (type === "materials") {
      validRows = rawRows.map((r, i) => {
        const itemCode = r["Item Code *"] || r["Item Code"] || `MAT-${String(i + 1).padStart(3, "0")}`;
        const name = r["Material Name *"] || r["Material Name"] || r["Name"];
        const category = r["Category"] || "Steel";
        const unit = r["Unit (MT/Kg/Sq.Ft/Nos/Boxes)"] || r["Unit"] || "Nos";
        const currentStock = parseFloat(r["Current Stock"]) || 0;
        const unitCost = parseFloat(r["Unit Cost (₹)"] || r["Unit Cost"]) || 0;
        const minAlertStock = parseFloat(r["Min Alert Level"]) || 10;
        const yardLocation = r["Yard Location"] || "Erode Yard - Bay 1";

        if (!name) errors.push(`Row ${i + 2}: Missing Material Name`);

        return {
          itemCode,
          name,
          category,
          unit,
          currentStock,
          unitCost,
          minAlertStock,
          yardLocation,
        };
      });
    } else if (type === "machines") {
      validRows = rawRows.map((r, i) => {
        const assetCode = r["Asset Code *"] || r["Asset Code"] || `MCH-${String(i + 1).padStart(3, "0")}`;
        const name = r["Tool Name *"] || r["Tool Name"] || r["Name"];
        const category = r["Category"] || "Power Tools";
        const group = r["Allocation Group (SRM01-SRM06/OFFICE)"] || "OFFICE";
        const location = r["Current Location"] || "Office Store";
        const cost = parseFloat(r["Purchase Cost (₹)"] || r["Cost"]) || 0;

        if (!name) errors.push(`Row ${i + 2}: Missing Tool Name`);

        return {
          assetCode,
          name,
          category,
          group,
          location,
          cost,
        };
      });
    }

    if (action === "preview") {
      return NextResponse.json({
        success: true,
        previewRows: validRows,
        totalRows: validRows.length,
        errors,
      });
    }

    // Action === "save": Commit rows to Database
    if (errors.length > 0) {
      throw new Error(`Cannot import with errors: ${errors.join("; ")}`);
    }

    let count = 0;
    if (type === "customers") {
      for (const row of validRows) {
        if (!row.name) continue;
        await prisma.customer.create({
          data: {
            name: row.name,
            companyName: row.companyName,
            phone: row.phone,
            billingAddress: row.billingAddress,
            gstNumber: row.gstin,
            stateCode: row.stateCode,
            creditDays: row.creditDays,
            openingBalance: new Decimal(row.openingBalance),
            outstandingBalance: new Decimal(row.openingBalance),
          },
        });
        count++;
      }
    } else if (type === "suppliers") {
      for (const row of validRows) {
        if (!row.name) continue;
        await prisma.supplier.create({
          data: {
            name: row.name,
            companyName: row.companyName,
            gstNumber: row.gstNumber,
            phone: row.phone,
            address: row.address,
            paymentTerms: row.paymentTerms,
            accountNumber: row.accountNumber,
            ifscCode: row.ifscCode,
          },
        });
        count++;
      }
    } else if (type === "materials") {
      for (const row of validRows) {
        if (!row.name) continue;
        await prisma.materialItem.upsert({
          where: { itemCode: row.itemCode },
          update: {
            currentStock: new Decimal(row.currentStock),
            unitCost: new Decimal(row.unitCost),
          },
          create: {
            itemCode: row.itemCode,
            name: row.name,
            category: row.category,
            unit: row.unit,
            currentStock: new Decimal(row.currentStock),
            unitCost: new Decimal(row.unitCost),
            minAlertStock: new Decimal(row.minAlertStock),
            yardLocation: row.yardLocation,
          },
        });
        count++;
      }
    } else if (type === "machines") {
      for (const row of validRows) {
        if (!row.name) continue;
        await prisma.machineAsset.upsert({
          where: { assetCode: row.assetCode },
          update: {
            currentLocation: row.location,
          },
          create: {
            assetCode: row.assetCode,
            name: row.name,
            category: row.category,
            currentLocation: row.location,
            purchaseCost: new Decimal(row.cost),
          },
        });
        count++;
      }
    }

    return NextResponse.json({ success: true, importedCount: count });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
