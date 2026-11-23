import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const machines = await prisma.machineAsset.findMany({
      orderBy: { sNo: "asc" },
    });

    const siteIssues = await prisma.siteMaterialIssue.findMany({
      orderBy: { date: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Standard Roofs Erode";
    workbook.created = new Date();

    // 1. Total_Machine_Inventory Sheet
    const masterSheet = workbook.addWorksheet("Total_Machine_Inventory");
    masterSheet.columns = [
      { header: "S No", key: "sNo", width: 8 },
      { header: "Materials", key: "materials", width: 35 },
      { header: "SR Final machine Count", key: "srFinal", width: 22 },
      { header: "Total Machine Count", key: "totalCount", width: 20 },
      { header: "Office", key: "office", width: 10 },
      { header: "SRM01", key: "srm01", width: 10 },
      { header: "SRM02", key: "srm02", width: 10 },
      { header: "SMR03", key: "srm03", width: 10 },
      { header: "SRM04", key: "srm04", width: 10 },
      { header: "SRM05", key: "srm05", width: 10 },
      { header: "SRM06", key: "srm06", width: 10 },
      { header: "Spare", key: "spare", width: 10 },
      { header: "Service", key: "service", width: 10 },
      { header: "Scrap", key: "scrap", width: 10 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    masterSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    masterSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };

    machines.forEach((m) => {
      masterSheet.addRow({
        sNo: m.sNo,
        materials: m.name,
        srFinal: m.srFinalCount,
        totalCount: m.totalCount,
        office: m.officeCount,
        srm01: m.srm01Count,
        srm02: m.srm02Count,
        srm03: m.srm03Count,
        srm04: m.srm04Count,
        srm05: m.srm05Count,
        srm06: m.srm06Count,
        spare: m.spareCount,
        service: m.serviceCount,
        scrap: m.scrapCount,
        notes: m.notes || "",
      });
    });

    // 2. Individual Team Sheets
    const teams = [
      { id: "SRM01", lead: "THENNARASU", phone: "7358129323", vehicle: "TN29AL4212", key: "srm01Count" },
      { id: "SRM02", lead: "Santhosh", phone: "9342377061", vehicle: "TN33AM9820", key: "srm02Count" },
      { id: "SMR03", lead: "Saran", phone: "9560654804", vehicle: "TN29AT1136 TVS SPORTS", key: "srm03Count" },
      { id: "SRM04", lead: "Tamil", phone: "8838070940", vehicle: "TN56A7754", key: "srm04Count" },
      { id: "SRM05", lead: "Unassigned Team 5", phone: "", vehicle: "Yard Allocation", key: "srm05Count" },
      { id: "SRM06", lead: "Sathish", phone: "9342477201", vehicle: "TN56A7754", key: "srm06Count" },
    ];

    for (const t of teams) {
      const sheet = workbook.addWorksheet(t.id);
      sheet.columns = [
        { header: "S No", key: "sNo", width: 8 },
        { header: "Materials", key: "materials", width: 35 },
        { header: "Quantity", key: "qty", width: 12 },
        { header: "Team Lead", key: "lead", width: 20 },
        { header: "Vehicle Number", key: "vehicle", width: 22 },
        { header: "Status", key: "status", width: 15 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      machines.forEach((m, idx) => {
        const count = (m as any)[t.key] || 0;
        if (count > 0) {
          sheet.addRow({
            sNo: idx + 1,
            materials: m.name,
            qty: count,
            lead: t.lead,
            vehicle: t.vehicle,
            status: "Allocated & Verified",
          });
        }
      });
    }

    // 3. Location Sheets: Office, Spare, Service, Scrap
    const locations = [
      { name: "Office", col: "officeCount", color: "FF0284C7" },
      { name: "Spare", col: "spareCount", color: "FF10B981" },
      { name: "Service", col: "serviceCount", color: "FFF59E0B" },
      { name: "Scrap", col: "scrapCount", color: "FFEF4444" },
    ];

    for (const loc of locations) {
      const sheet = workbook.addWorksheet(loc.name);
      sheet.columns = [
        { header: "S No", key: "sNo", width: 8 },
        { header: "Materials / Equipment", key: "materials", width: 35 },
        { header: "Quantity", key: "qty", width: 15 },
        { header: "Location", key: "loc", width: 20 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: loc.color } };

      machines.forEach((m, idx) => {
        const count = (m as any)[loc.col] || 0;
        if (count > 0) {
          sheet.addRow({
            sNo: idx + 1,
            materials: m.name,
            qty: count,
            loc: loc.name,
            notes: m.notes || "",
          });
        }
      });
    }

    // 4. Consumables & Daily Issue Sheet
    const issueSheet = workbook.addWorksheet("Site_Consumables_Register");
    issueSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Team", key: "team", width: 12 },
      { header: "Project Site", key: "site", width: 30 },
      { header: "Item Description", key: "item", width: 30 },
      { header: "Qty Issued", key: "issued", width: 12 },
      { header: "Qty Returned", key: "returned", width: 12 },
      { header: "Returnable?", key: "returnable", width: 15 },
      { header: "Issued By", key: "issuedBy", width: 18 },
      { header: "Approved By", key: "approvedBy", width: 18 },
      { header: "Condition", key: "condition", width: 12 },
    ];

    issueSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    issueSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };

    siteIssues.forEach((issue) => {
      issueSheet.addRow({
        date: new Date(issue.date).toLocaleDateString("en-IN"),
        team: issue.team,
        site: issue.siteName || "Site",
        item: issue.productName,
        issued: Number(issue.quantity),
        returned: Number(issue.returnedQty),
        returnable: issue.isReturnable ? "Yes" : "No",
        issuedBy: issue.issuedBy,
        approvedBy: issue.approvedBy,
        condition: issue.condition,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `2026_SRMachines_Tracking_System_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/machines/excel error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Excel file (.xlsx) is required." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as any);

    const masterSheet = workbook.getWorksheet("Total_Machine_Inventory") || workbook.worksheets[0];
    if (!masterSheet) {
      return NextResponse.json({ success: false, error: "Sheet 'Total_Machine_Inventory' not found in uploaded workbook." }, { status: 400 });
    }

    let updatedCount = 0;

    // Iterate rows starting after header (row 2)
    masterSheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        const sNo = row.getCell(1).value ? Number(row.getCell(1).value) : rowNumber - 1;
        const name = String(row.getCell(2).value || "").trim();
        const office = Number(row.getCell(5).value) || 0;
        const srm01 = Number(row.getCell(6).value) || 0;
        const srm02 = Number(row.getCell(7).value) || 0;
        const srm03 = Number(row.getCell(8).value) || 0;
        const srm04 = Number(row.getCell(9).value) || 0;
        const srm05 = Number(row.getCell(10).value) || 0;
        const srm06 = Number(row.getCell(11).value) || 0;
        const spare = Number(row.getCell(12).value) || 0;
        const service = Number(row.getCell(13).value) || 0;
        const scrap = Number(row.getCell(14).value) || 0;
        const notes = row.getCell(15).value ? String(row.getCell(15).value).trim() : null;

        const totalCount = office + srm01 + srm02 + srm03 + srm04 + srm05 + srm06 + spare + service + scrap;
        const srFinalCount = office + srm01 + srm02 + srm03 + srm04 + srm05 + srm06 + spare;

        if (name) {
          prisma.machineAsset.updateMany({
            where: { sNo },
            data: {
              name,
              officeCount: office,
              srm01Count: srm01,
              srm02Count: srm02,
              srm03Count: srm03,
              srm04Count: srm04,
              srm05Count: srm05,
              srm06Count: srm06,
              spareCount: spare,
              serviceCount: service,
              scrapCount: scrap,
              totalCount,
              srFinalCount,
              notes,
            },
          }).then(() => {});
          updatedCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Excel workbook imported successfully. Synced ${updatedCount} machine records.`,
    });
  } catch (error: any) {
    console.error("POST /api/machines/excel error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
