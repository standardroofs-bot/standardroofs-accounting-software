import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        invoices: { include: { payments: true } },
        expenses: { include: { account: true } },
        purchaseBills: { include: { supplier: true } },
        contractorMilestones: { include: { contractor: true } },
        cashBookEntries: true,
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Standard Roofs Books";

    // Sheet 1: Site Executive P&L Summary
    const summarySheet = workbook.addWorksheet("Site_PnL_Summary");
    summarySheet.columns = [
      { header: "Metric / Financial Line", key: "metric", width: 40 },
      { header: "Amount (₹)", key: "amount", width: 22 },
      { header: "Notes / Details", key: "notes", width: 45 },
    ];

    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Deep Navy
    };

    let totalBilled = 0;
    let totalReceived = 0;
    project.invoices.forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalBilled += Number(inv.totalAmount);
        totalReceived += Number(inv.amountPaid);
      }
    });
    project.cashBookEntries.forEach((cb) => {
      if (cb.type === "CASH_INFLOW") totalReceived += Number(cb.amount);
    });

    let materialCost = 0;
    project.purchaseBills.forEach((pb) => (materialCost += Number(pb.totalAmount)));

    let contractorCost = 0;
    project.contractorMilestones.forEach((cm) => (contractorCost += Number(cm.milestoneAmount)));

    let siteExpenses = 0;
    project.expenses.forEach((e: any) => {
      if (!e.isOfficeExpense) siteExpenses += Number(e.amount);
    });
    project.cashBookEntries.forEach((cb) => {
      if (cb.type === "CASH_OUTFLOW" && !cb.isOfficeExpense) siteExpenses += Number(cb.amount);
    });

    const totalProjectCost = materialCost + contractorCost + siteExpenses;
    const netSiteProfit = totalReceived > 0 ? totalReceived - totalProjectCost : totalBilled - totalProjectCost;
    const marginPct = (totalReceived > 0 ? totalReceived : totalBilled) > 0
      ? (netSiteProfit / (totalReceived > 0 ? totalReceived : totalBilled)) * 100
      : 0;

    summarySheet.addRow(["Project Code", project.code, "Unique Project Identifier"]);
    summarySheet.addRow(["Site / Project Name", project.name, `Client: ${project.customer.name}`]);
    summarySheet.addRow(["Site Location", `${project.siteLocation}, ${project.city}`, `Roof Type: ${project.roofType}`]);
    summarySheet.addRow(["Total Contract Value", Number(project.contractValue), "Agreed Client Contract Value"]);
    summarySheet.addRow(["Total Billed (Invoices)", totalBilled, "GST Tax Invoices Issued"]);
    summarySheet.addRow(["Total Money Received (Collections)", totalReceived, "Bank + Cash Client Collections"]);
    summarySheet.addRow(["Balance Pending from Client", Number(project.contractValue) - totalReceived, "Pending Receivables"]);
    summarySheet.addRow(["1. Steel & Roofing Materials", materialCost, "Direct Purchase Bills & Yard Stock"]);
    summarySheet.addRow(["2. Contractor Milestone Payouts", contractorCost, "Structural & Fabrication Subcontractors"]);
    summarySheet.addRow(["3. Site Expenses, Labour & Transport", siteExpenses, "Direct Site Gang Expenses & Consumables"]);
    summarySheet.addRow(["TOTAL DIRECT SITE COSTS", totalProjectCost, "Total Direct Outflow on this Project"]);
    summarySheet.addRow(["NET SITE PROFIT / (LOSS)", netSiteProfit, `Margin: ${marginPct.toFixed(1)}%`]);

    // Sheet 2: Chronological Passbook
    const passbookSheet = workbook.addWorksheet("Site_Passbook_Ledger");
    passbookSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Voucher / Ref No", key: "vch", width: 22 },
      { header: "Category", key: "cat", width: 25 },
      { header: "Team", key: "team", width: 18 },
      { header: "Particulars", key: "desc", width: 40 },
      { header: "Money In (₹)", key: "inflow", width: 16 },
      { header: "Money Out (₹)", key: "outflow", width: 16 },
      { header: "Mode", key: "mode", width: 12 },
    ];

    const pHeaderRow = passbookSheet.getRow(1);
    pHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    pHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" }, // Teal
    };

    project.invoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        passbookSheet.addRow([
          new Date(p.paymentDate).toISOString().split("T")[0],
          p.referenceNumber || inv.invoiceNumber,
          "Client Payment Received",
          "Customer",
          `Payment for ${inv.invoiceNumber}`,
          Number(p.amount),
          0,
          p.paymentMode,
        ]);
      });
    });

    project.cashBookEntries.forEach((cb) => {
      passbookSheet.addRow([
        new Date(cb.date).toISOString().split("T")[0],
        cb.voucherNumber,
        cb.category,
        cb.teamName || "Site Cash",
        cb.purpose,
        cb.type === "CASH_INFLOW" ? Number(cb.amount) : 0,
        cb.type === "CASH_OUTFLOW" ? Number(cb.amount) : 0,
        "Cash",
      ]);
    });

    project.purchaseBills.forEach((pb) => {
      passbookSheet.addRow([
        new Date(pb.date).toISOString().split("T")[0],
        pb.billNumber,
        "Material Purchase",
        "Procurement",
        `Vendor: ${pb.supplier.name}`,
        0,
        Number(pb.totalAmount),
        "Bill",
      ]);
    });

    project.contractorMilestones.forEach((cm) => {
      passbookSheet.addRow([
        new Date(cm.createdAt).toISOString().split("T")[0],
        cm.contractor.code || "CON-VCH",
        "Contractor Milestone",
        cm.teamName || "Contractor",
        `${cm.contractor.name} - ${cm.workStageDescription}`,
        0,
        Number(cm.milestoneAmount),
        "Bank",
      ]);
    });

    project.expenses.forEach((e: any) => {
      if (!e.isOfficeExpense) {
        passbookSheet.addRow([
          new Date(e.date).toISOString().split("T")[0],
          e.voucherNumber,
          e.category || "Site Expense",
          e.teamName || "Site Gang",
          e.purpose,
          0,
          Number(e.amount),
          e.paymentMode,
        ]);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `SR-Site-PnL-${project.code.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Export site P&L error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
