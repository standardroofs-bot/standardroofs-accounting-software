import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "accounts";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Standard Roofs Books";

    let filename = `SR-Books-Template-${type}.xlsx`;

    const applyHeaderStyle = (sheet: any) => {
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Deep Navy
      };
      headerRow.height = 28;
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
    };

    if (type === "accounts" || type === "accounts_master") {
      filename = "SR-Books-Master-Accounts-Register-Template.xlsx";

      // 1. Unified Master Accounts Register
      const s1 = workbook.addWorksheet("Master_Accounts_Register");
      s1.columns = [
        { header: "Date (DD/MM/YYYY) *", key: "date", width: 18 },
        { header: "Site / Project Name *", key: "site", width: 30 },
        { header: "Customer Name", key: "customer", width: 25 },
        { header: "Team Name (SRM01-SRM06 / Team Thenarrusu / Office)", key: "team", width: 25 },
        { header: "Particulars / Description *", key: "particulars", width: 40 },
        { header: "Category (Material / Labour / Contractor / Transport / Food / Office / Customer Payment) *", key: "category", width: 35 },
        { header: "Money In (₹)", key: "moneyIn", width: 16 },
        { header: "Money Out (₹)", key: "moneyOut", width: 16 },
        { header: "Payment Mode (Cash / Bank / UPI)", key: "paymentMode", width: 18 },
        { header: "Bill / Voucher / Ref No", key: "voucherNo", width: 22 },
      ];
      applyHeaderStyle(s1);

      s1.addRow(["02/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "SRM01", "Client Stage 1 Advance Received", "Customer Payment", 250000, 0, "Bank", "NEFT-9912"]);
      s1.addRow(["03/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "SRM01", "MS Purlins & Roofing Screws", "Material", 0, 85000, "Bank", "INV-5541"]);
      s1.addRow(["05/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "SRM01", "Site Labour Muster Payout (15 Days)", "Labour", 0, 42000, "Cash", "VCH-012"]);
      s1.addRow(["06/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "Team Thenarrusu", "Truss Erection Subcontractor Stage 1", "Contractor", 0, 50000, "Bank", "CON-001"]);
      s1.addRow(["07/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "SRM01", "Bolero Pickup Diesel & Crane Unloading", "Transport", 0, 7500, "Cash", "EXP-088"]);
      s1.addRow(["08/04/2026", "Texvalley Factory Shed 4", "Texvalley Market Ltd", "SRM01", "Site Team Tea, Meals & Water Supply", "Food", 0, 3200, "Cash", "EXP-089"]);
      s1.addRow(["10/04/2026", "Erode Head Office", "", "Office", "Erode Yard & Office Rent for April 2026", "Office", 0, 25000, "Bank", "OFF-RENT-04"]);
      s1.addRow(["10/04/2026", "Erode Head Office", "", "Office", "TANGEDCO Office & Yard Electricity Bill", "Office", 0, 4800, "Bank", "EB-0426"]);

      // 2. Sites & Contract Values
      const s2 = workbook.addWorksheet("Sites_and_Contracts");
      s2.columns = [
        { header: "Site / Project Name *", key: "siteName", width: 30 },
        { header: "Customer / Client Name *", key: "customerName", width: 25 },
        { header: "Site Location *", key: "location", width: 25 },
        { header: "Roof Type (PEB / Clay Tile / Tensile / UPVC / Solar)", key: "roofType", width: 20 },
        { header: "Total Sq.Ft", key: "sqft", width: 14 },
        { header: "Total Contract Value (₹) *", key: "contractValue", width: 22 },
        { header: "Assigned Teams (e.g., SRM01, Team Thenarrusu)", key: "teams", width: 30 },
      ];
      applyHeaderStyle(s2);
      s2.addRow(["Texvalley Factory Shed 4", "Texvalley Market Ltd", "Gangapuram, Erode", "PEB", 12500, 1500000, "SRM01, Team Thenarrusu"]);
      s2.addRow(["Perundurai Spinning Mill Roof", "Perundurai Textiles", "SIPCOT, Perundurai", "PEB", 8500, 950000, "SRM02, Team Saran"]);

      // 3. Site Expenses
      const s3 = workbook.addWorksheet("Site_Expenses");
      s3.columns = [
        { header: "Date *", key: "date", width: 15 },
        { header: "Site Name *", key: "siteName", width: 30 },
        { header: "Team (SRM01-SRM06 / Other) *", key: "team", width: 20 },
        { header: "Particulars / Purpose *", key: "purpose", width: 35 },
        { header: "Category (Material / Transport / Food / Consumables / Other) *", key: "cat", width: 25 },
        { header: "Amount (₹) *", key: "amount", width: 15 },
        { header: "Payment Mode (Cash / Bank)", key: "mode", width: 15 },
      ];
      applyHeaderStyle(s3);
      s3.addRow(["04/04/2026", "Texvalley Factory Shed 4", "SRM01", "Welding Rods & 5 inch Cutting Wheels", "Consumables", 4500, "Cash"]);
      s3.addRow(["06/04/2026", "Texvalley Factory Shed 4", "SRM01", "Eicher Crane Shift Charges for Purlins", "Transport", 8000, "Bank"]);

      // 4. Labour & Contractors
      const s4 = workbook.addWorksheet("Labour_and_Contractors");
      s4.columns = [
        { header: "Date *", key: "date", width: 15 },
        { header: "Site Name *", key: "siteName", width: 30 },
        { header: "Person / Contractor Name *", key: "name", width: 25 },
        { header: "Team (SRM01-SRM06 / Team Thenarrusu) *", key: "team", width: 22 },
        { header: "Work Stage / Description *", key: "desc", width: 35 },
        { header: "Amount (₹) *", key: "amount", width: 15 },
        { header: "Mode (Cash / Bank)", key: "mode", width: 15 },
      ];
      applyHeaderStyle(s4);
      s4.addRow(["05/04/2026", "Texvalley Factory Shed 4", "SRM01 Site Gang (6 fitters)", "SRM01", "15-Day Muster Wage Payment", 42000, "Cash"]);
      s4.addRow(["06/04/2026", "Texvalley Factory Shed 4", "Thenarrusu Contractors", "Team Thenarrusu", "Structure Fabrication Milestone 1", 50000, "Bank"]);

      // 5. Office Overheads
      const s5 = workbook.addWorksheet("Office_Overheads");
      s5.columns = [
        { header: "Date *", key: "date", width: 15 },
        { header: "Particulars *", key: "particulars", width: 35 },
        { header: "Category (Rent / EB / Salaries / Stationery / Tea / Fuel / Finance) *", key: "cat", width: 30 },
        { header: "Amount (₹) *", key: "amount", width: 15 },
        { header: "Payment Mode (Cash / Bank)", key: "mode", width: 15 },
        { header: "Voucher / Reference No", key: "vch", width: 20 },
      ];
      applyHeaderStyle(s5);
      s5.addRow(["10/04/2026", "Erode Office & Yard Rent", "Rent", 25000, "Bank", "CHQ-10023"]);
      s5.addRow(["10/04/2026", "Office Tea & Refreshments", "Tea", 2400, "Cash", "EXP-092"]);

    } else if (type === "customers") {
      const sheet = workbook.addWorksheet("Customers");
      sheet.columns = [
        { header: "Name *", key: "name", width: 25 },
        { header: "Company Name", key: "companyName", width: 30 },
        { header: "Mobile *", key: "phone", width: 16 },
        { header: "GSTIN (15 digits)", key: "gstin", width: 20 },
        { header: "State Code (33 for TN)", key: "stateCode", width: 15 },
        { header: "Billing Address *", key: "billingAddress", width: 35 },
        { header: "Credit Days", key: "creditDays", width: 12 },
        { header: "Opening Balance (₹)", key: "openingBalance", width: 18 },
      ];
      applyHeaderStyle(sheet);
      sheet.addRow(["K. Shanmugam", "Erode Tex Mills Ltd", "9842712345", "33AAAAA1234A1Z5", "33", "B-12, SIPCOT Industrial Park, Perundurai", 30, 0]);
    } else if (type === "suppliers") {
      const sheet = workbook.addWorksheet("Suppliers");
      sheet.columns = [
        { header: "Supplier Name *", key: "name", width: 25 },
        { header: "Company Name", key: "companyName", width: 30 },
        { header: "GSTIN", key: "gstNumber", width: 20 },
        { header: "Phone", key: "phone", width: 16 },
        { header: "Address", key: "address", width: 35 },
        { header: "Payment Terms", key: "paymentTerms", width: 15 },
        { header: "Bank Account No", key: "accountNumber", width: 20 },
        { header: "IFSC Code", key: "ifscCode", width: 15 },
      ];
      applyHeaderStyle(sheet);
      sheet.addRow(["R. Vignesh", "Kovai Steel & Structural Tube Traders", "33BBBBB5678B1Z6", "9443355667", "45, Mill Road, Coimbatore", "15 Days", "004505001122", "ICIC0000045"]);
    } else if (type === "materials") {
      const sheet = workbook.addWorksheet("Raw Materials");
      sheet.columns = [
        { header: "Item Code *", key: "itemCode", width: 15 },
        { header: "Material Name *", key: "name", width: 35 },
        { header: "Category", key: "category", width: 15 },
        { header: "Unit (MT/Kg/Sq.Ft/Nos/Boxes)", key: "unit", width: 20 },
        { header: "Current Stock", key: "currentStock", width: 15 },
        { header: "Unit Cost (₹)", key: "unitCost", width: 15 },
        { header: "Min Alert Level", key: "minAlertStock", width: 15 },
        { header: "Yard Location", key: "yardLocation", width: 25 },
      ];
      applyHeaderStyle(sheet);
      sheet.addRow(["MAT-010", "Tata Structura 75x75x3.2mm MS Tube", "Steel", "MT", 15, 72000, 5, "Erode Yard - Bay 1"]);
    } else if (type === "machines") {
      const sheet = workbook.addWorksheet("Machines & Tools");
      sheet.columns = [
        { header: "Asset Code *", key: "assetCode", width: 15 },
        { header: "Tool Name *", key: "name", width: 35 },
        { header: "Category", key: "category", width: 20 },
        { header: "Allocation Group (SRM01-SRM06/OFFICE)", key: "group", width: 25 },
        { header: "Current Location", key: "location", width: 20 },
        { header: "Purchase Cost (₹)", key: "cost", width: 15 },
      ];
      applyHeaderStyle(sheet);
      sheet.addRow(["MCH-017", "Bosch GWS 600 Angle Grinder 4 inch", "Power Tools", "SRM01", "Perundurai Site", 3500]);
    }

    const buffer = await (workbook.xlsx as any).writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Template error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
