import ExcelJS from "exceljs";
import path from "path";

async function generateExcel() {
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

  const masterData = [
    { sNo: 1, materials: "Vehicle", srFinal: 13, totalCount: 16, office: 9, srm01: 1, srm02: 1, srm03: 1, srm04: 0, srm05: 1, srm06: 0, spare: 1, service: 1, scrap: 1, notes: "Uthukuli one XL" },
    { sNo: 2, materials: "Welding Machine & Holder Set", srFinal: 4, totalCount: 7, office: 3, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 1, spare: 1, service: 0, scrap: 0, notes: "" },
    { sNo: 3, materials: "Small Cutting Machine", srFinal: 2, totalCount: 3, office: 0, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 1, spare: 1, service: 0, scrap: 0, notes: "" },
    { sNo: 4, materials: "Breaker Machine", srFinal: 2, totalCount: 4, office: 1, srm01: 1, srm02: 1, srm03: 0, srm04: 0, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 5, materials: "Battery/ ElectricalScrewing Machine", srFinal: 4, totalCount: 7, office: 2, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 1, spare: 1, service: 0, scrap: 0, notes: "" },
    { sNo: 6, materials: "Tester", srFinal: 6, totalCount: 6, office: 1, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 7, materials: "Level tube", srFinal: 4, totalCount: 4, office: 2, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 1, spare: 1, service: 0, scrap: 0, notes: "" },
    { sNo: 8, materials: "Chalk Bit (Kalar bit)", srFinal: 14, totalCount: 14, office: 0, srm01: 1, srm02: 2, srm03: 1, srm04: 2, srm05: 2, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 9, materials: "Star Bit", srFinal: 4, totalCount: 4, office: 0, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 10, materials: "Breaker Bit", srFinal: 8, totalCount: 8, office: 0, srm01: 2, srm02: 2, srm03: 0, srm04: 2, srm05: 2, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 11, materials: "Breaker Drill Bit 14mm", srFinal: 8, totalCount: 8, office: 0, srm01: 1, srm02: 10, srm03: 0, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 12, materials: "Moolaimatta scale", srFinal: 4, totalCount: 10, office: 6, srm01: 1, srm02: 1, srm03: 0, srm04: 0, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 13, materials: "Level Tester Medium", srFinal: 5, totalCount: 5, office: 1, srm01: 1, srm02: 1, srm03: 0, srm04: 0, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 14, materials: "Black Oyar (Electrical Wire)", srFinal: 12, totalCount: 12, office: 5, srm01: 1, srm02: 1, srm03: 0, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 15, materials: "Leather Carrying Bag", srFinal: 7, totalCount: 7, office: 3, srm01: 0, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 16, materials: "Sutthi (Hammer)", srFinal: 8, totalCount: 8, office: 3, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 17, materials: "Vuli (Chisel)", srFinal: 6, totalCount: 6, office: 6, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 2, service: 0, scrap: 0, notes: "" },
    { sNo: 18, materials: "Cutting plier", srFinal: 5, totalCount: 5, office: 5, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 19, materials: "Wire Cutting Plier", srFinal: 7, totalCount: 7, office: 2, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 20, materials: "Switch Box", srFinal: 7, totalCount: 7, office: 3, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 1, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 21, materials: "Small Tape", srFinal: 5, totalCount: 5, office: 4, srm01: 2, srm02: 1, srm03: 2, srm04: 2, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 22, materials: "Big Tape", srFinal: 5, totalCount: 5, office: 3, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 23, materials: "Mulamattam Thukku", srFinal: 4, totalCount: 6, office: 2, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 24, materials: "Thread (Nool Kandu)", srFinal: 18, totalCount: 18, office: 18, srm01: 2, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 25, materials: "Wire Tape", srFinal: 10, totalCount: 10, office: 5, srm01: 2, srm02: 2, srm03: 2, srm04: 2, srm05: 2, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 26, materials: "Meson Karandi", srFinal: 12, totalCount: 12, office: 0, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 27, materials: "Screw Driver", srFinal: 10, totalCount: 10, office: 6, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 28, materials: "Hacksaw blade", srFinal: 8, totalCount: 8, office: 3, srm01: 1, srm02: 1, srm03: 1, srm04: 1, srm05: 1, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 29, materials: "SR Name Plate", srFinal: 10, totalCount: 10, office: 4, srm01: 2, srm02: 2, srm03: 2, srm04: 2, srm05: 2, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 30, materials: "Office T-shirt", srFinal: 2, totalCount: 2, office: 2, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
    { sNo: 31, materials: "Compression Painting Machine", srFinal: 1, totalCount: 1, office: 1, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "Office Big godown - right side corner" },
    { sNo: 32, materials: "Blower Electric Machine", srFinal: 1, totalCount: 1, office: 1, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "Office" },
    { sNo: 33, materials: "Water Wash Machine", srFinal: 1, totalCount: 1, office: 1, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "Labour cupboard" },
    { sNo: 34, materials: "Big Drilling Machine", srFinal: 1, totalCount: 1, office: 1, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "Labour cupboard" },
    { sNo: 35, materials: "Big Cutting Machine", srFinal: 1, totalCount: 1, office: 1, srm01: 0, srm02: 0, srm03: 0, srm04: 0, srm05: 0, srm06: 0, spare: 0, service: 0, scrap: 0, notes: "" },
  ];

  masterData.forEach((row) => masterSheet.addRow(row));

  // Style header row
  masterSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  masterSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };

  // 2. Individual Team Sheets (SRM01 - SRM06)
  const teams = [
    { id: "SRM01", lead: "THENNARASU", phone: "7358129323", date: "2026-12-11", issuedBy: "GOWRI SANKAR", vehicle: "TN29AL4212" },
    { id: "SRM02", lead: "Santhosh", phone: "9342377061", date: "13/11/2026", issuedBy: "Gowri Sankar", vehicle: "TN33AM9820" },
    { id: "SMR03", lead: "Saran", phone: "9560654804", date: "13/11/2026", issuedBy: "SIVAKUMAR", vehicle: "TN29AT1136 TVS SPORTS" },
    { id: "SRM04", lead: "Tamil", phone: "8838070940", date: "13/11/2026", issuedBy: "Siva Kumar", vehicle: "TN56A7754" },
    { id: "SRM05", lead: "Unassigned Team 5", phone: "", date: "13/11/2026", issuedBy: "Office", vehicle: "Yard Allocation" },
    { id: "SRM06", lead: "Sathish", phone: "9342477201", date: "13/12/2026", issuedBy: "Gowri Sankar", vehicle: "TN56A7754" },
  ];

  for (const t of teams) {
    const sheet = workbook.addWorksheet(t.id);
    sheet.columns = [
      { header: "S No", key: "sNo", width: 8 },
      { header: "Materials", key: "materials", width: 35 },
      { header: "Quantity", key: "qty", width: 12 },
      { header: "Team / In-Charge", key: "lead", width: 20 },
      { header: "Vehicle Number", key: "vehicle", width: 22 },
      { header: "Issued By", key: "issuedBy", width: 18 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

    // Add items allocated to this team
    masterData.forEach((item, idx) => {
      const teamKey = t.id.toLowerCase() as keyof typeof item;
      const count = Number(item[teamKey]) || 0;
      if (count > 0) {
        sheet.addRow({
          sNo: idx + 1,
          materials: item.materials,
          qty: count,
          lead: t.lead,
          vehicle: t.vehicle,
          issuedBy: t.issuedBy,
        });
      }
    });
  }

  // 3. Location Sheets: Office, Spare, Service, Scrap
  const locations = [
    { name: "Office", color: "FF0284C7" },
    { name: "Spare", color: "FF10B981" },
    { name: "Service", color: "FFF59E0B" },
    { name: "Scrap", color: "FFEF4444" },
  ];

  for (const loc of locations) {
    const sheet = workbook.addWorksheet(loc.name);
    sheet.columns = [
      { header: "S No", key: "sNo", width: 8 },
      { header: "Materials / Equipment", key: "materials", width: 35 },
      { header: "Current Quantity", key: "qty", width: 18 },
      { header: "Location / Status", key: "loc", width: 20 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: loc.color } };

    masterData.forEach((item, idx) => {
      const locKey = loc.name.toLowerCase() as keyof typeof item;
      const count = Number(item[locKey]) || 0;
      if (count > 0) {
        sheet.addRow({
          sNo: idx + 1,
          materials: item.materials,
          qty: count,
          loc: loc.name,
          notes: item.notes || "",
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

  const sampleIssues = [
    { date: "2026-01-22", team: "SRM01", site: "Sakthi Team - Vasudevan Kumarapalayam", item: "Welding Rods (Boxes)", issued: 2, returned: 0, returnable: "No", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: "2026-01-22", team: "SRM01", site: "Sakthi Team - Vasudevan Kumarapalayam", item: '5" Cutting Wheel', issued: 25, returned: 0, returnable: "No", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: "2026-01-24", team: "SRM02", site: "Velu Team - Pravin Erode", item: "Kerala Paint (Cans)", issued: 5, returned: 0, returnable: "No", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: "2026-01-24", team: "SRM02", site: "Velu Team - Pravin Erode", item: "U-Clamps", issued: 12, returned: 0, returnable: "No", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: "2026-01-25", team: "SRM04", site: "Velu Team - Mani Karur", item: '5" Cutting Wheel', issued: 25, returned: 0, returnable: "No", issuedBy: "Siva Kumar", approvedBy: "Gowri Sankar", condition: "Good" },
    { date: "2026-02-01", team: "SRM06", site: "Gem Hospital Erode", item: "Safety Belts & Harness", issued: 4, returned: 4, returnable: "Yes", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
    { date: "2026-02-01", team: "SRM06", site: "Vellalar Edu. Trust", item: "Level Tube (50m)", issued: 1, returned: 1, returnable: "Yes", issuedBy: "Gowri Sankar", approvedBy: "Siva Kumar", condition: "Good" },
  ];

  sampleIssues.forEach((row) => issueSheet.addRow(row));

  const filePath = path.join(process.cwd(), "2026_SRMachines_Tracking_System.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`✓ Generated 2026_SRMachines_Tracking_System.xlsx with all sheets at: ${filePath}`);
}

generateExcel().catch(console.error);
