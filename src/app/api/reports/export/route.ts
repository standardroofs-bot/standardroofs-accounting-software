import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(req: NextRequest) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Standard Roofs Books (SR-Books)";
    workbook.created = new Date();

    // 1. Fetch data
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: { select: { debit: true, credit: true } },
      },
      orderBy: { code: "asc" },
    });

    const trialBalance = accounts.map((acc) => {
      let totalDr = toDecimal(0);
      let totalCr = toDecimal(0);
      acc.journalLines.forEach((l) => {
        totalDr = totalDr.plus(toDecimal(l.debit));
        totalCr = totalCr.plus(toDecimal(l.credit));
      });
      let net = toDecimal(0);
      if (acc.type === "ASSET" || acc.type === "EXPENSE") {
        net = totalDr.minus(totalCr);
      } else {
        net = totalCr.minus(totalDr);
      }
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        dr: totalDr.toNumber(),
        cr: totalCr.toNumber(),
        net: net.toNumber(),
      };
    });

    // SHEET 1: Profit & Loss
    const pnlSheet = workbook.addWorksheet("Profit & Loss Statement");
    pnlSheet.columns = [
      { header: "Account Code", key: "code", width: 15 },
      { header: "Account Name", key: "name", width: 35 },
      { header: "Category", key: "type", width: 15 },
      { header: "Amount (₹)", key: "amount", width: 20 },
    ];
    pnlSheet.addRow(["--- INCOME ---", "", "", ""]);
    const incomeAccs = trialBalance.filter((a) => a.type === "INCOME");
    incomeAccs.forEach((a) => pnlSheet.addRow([a.code, a.name, a.type, a.net]));
    const totalInc = incomeAccs.reduce((s, a) => s + a.net, 0);
    pnlSheet.addRow(["Total Revenue / Income", "", "", totalInc]);

    pnlSheet.addRow([]);
    pnlSheet.addRow(["--- EXPENSES ---", "", "", ""]);
    const expAccs = trialBalance.filter((a) => a.type === "EXPENSE");
    expAccs.forEach((a) => pnlSheet.addRow([a.code, a.name, a.type, a.net]));
    const totalExp = expAccs.reduce((s, a) => s + a.net, 0);
    pnlSheet.addRow(["Total Operating Expenses", "", "", totalExp]);

    pnlSheet.addRow([]);
    pnlSheet.addRow(["NET PROFIT / (LOSS)", "", "", totalInc - totalExp]);

    // SHEET 2: Balance Sheet
    const bsSheet = workbook.addWorksheet("Balance Sheet");
    bsSheet.columns = [
      { header: "Account Code", key: "code", width: 15 },
      { header: "Account Description", key: "name", width: 35 },
      { header: "Classification", key: "subType", width: 22 },
      { header: "Balance (₹)", key: "balance", width: 20 },
    ];
    bsSheet.addRow(["--- ASSETS ---", "", "", ""]);
    const assets = trialBalance.filter((a) => a.type === "ASSET");
    assets.forEach((a) => bsSheet.addRow([a.code, a.name, a.subType, a.net]));
    const totalAst = assets.reduce((s, a) => s + a.net, 0);
    bsSheet.addRow(["TOTAL ASSETS", "", "", totalAst]);

    bsSheet.addRow([]);
    bsSheet.addRow(["--- LIABILITIES ---", "", "", ""]);
    const liabs = trialBalance.filter((a) => a.type === "LIABILITY");
    liabs.forEach((a) => bsSheet.addRow([a.code, a.name, a.subType, a.net]));
    const totalLiab = liabs.reduce((s, a) => s + a.net, 0);
    bsSheet.addRow(["TOTAL LIABILITIES", "", "", totalLiab]);

    bsSheet.addRow([]);
    bsSheet.addRow(["--- EQUITY & RESERVES ---", "", "", ""]);
    const equities = trialBalance.filter((a) => a.type === "EQUITY");
    equities.forEach((a) => bsSheet.addRow([a.code, a.name, a.subType, a.net]));
    bsSheet.addRow(["Current Year P&L Surplus", "", "RETAINED_EARNINGS", totalInc - totalExp]);
    const totalEq = equities.reduce((s, a) => s + a.net, 0) + (totalInc - totalExp);
    bsSheet.addRow(["TOTAL LIABILITIES & EQUITY", "", "", totalLiab + totalEq]);

    // SHEET 3: Cash Flow Statement (Strict Double-Entry Reconciliation)
    const cfSheet = workbook.addWorksheet("Cash Flow Statement");
    cfSheet.columns = [
      { header: "Activity / Particulars", key: "activity", width: 45 },
      { header: "Cash Inflow (₹)", key: "inflow", width: 20 },
      { header: "Cash Outflow (₹)", key: "outflow", width: 20 },
      { header: "Net Cash Flow (₹)", key: "net", width: 20 },
    ];

    const cashBankAccs = trialBalance.filter(
      (a) => a.code === "1010" || a.code.startsWith("102") || a.subType === "CASH" || a.subType === "BANK"
    );
    const cashBankIds = new Set(cashBankAccs.map((a) => a.id));

    const openingCash = 0; // Clean slate start
    const closingCash = cashBankAccs.reduce((s, a) => s + a.net, 0);

    const cashJournals = await prisma.journalEntry.findMany({
      where: {
        status: "POSTED",
        lines: { some: { accountId: { in: Array.from(cashBankIds) } } },
      },
      include: { lines: { include: { account: true } } },
    });

    let opIn = 0, opOut = 0, invIn = 0, invOut = 0, finIn = 0, finOut = 0;
    cashJournals.forEach((j) => {
      let netCash = 0;
      j.lines.forEach((l) => {
        if (cashBankIds.has(l.accountId)) netCash += Number(l.debit) - Number(l.credit);
      });
      if (Math.abs(netCash) < 0.001) return;

      const hasEquity = j.lines.some((l) => l.account.type === "EQUITY" || l.account.code.startsWith("30"));
      const hasLoan = j.lines.some((l) => l.account.code === "2060" || l.account.code === "2061" || l.account.code === "5100");
      const hasFixedAsset = j.lines.some((l) => l.account.code.startsWith("15"));

      if (hasEquity || hasLoan || j.voucherType === "CAPITAL_TRANSACTION" || j.voucherType === "LOAN_DISBURSEMENT" || j.voucherType === "LOAN_EMI") {
        if (netCash > 0) finIn += netCash; else finOut += Math.abs(netCash);
      } else if (hasFixedAsset || j.voucherType === "FIXED_ASSET_ACQUISITION") {
        if (netCash > 0) invIn += netCash; else invOut += Math.abs(netCash);
      } else {
        if (netCash > 0) opIn += netCash; else opOut += Math.abs(netCash);
      }
    });

    cfSheet.addRow(["1. CASH FLOW FROM OPERATING ACTIVITIES", "", "", ""]);
    cfSheet.addRow(["Receipts from Customers / Sales Invoices", opIn, 0, opIn]);
    cfSheet.addRow(["Payments to Suppliers, Site Expenses & Labour", 0, opOut, -opOut]);
    cfSheet.addRow(["Net Cash Flow from Operating Activities", "", "", opIn - opOut]);
    cfSheet.addRow([]);

    cfSheet.addRow(["2. CASH FLOW FROM INVESTING ACTIVITIES", "", "", ""]);
    cfSheet.addRow(["Purchase / Sale of PEB Machinery & Vehicles", invIn, invOut, invIn - invOut]);
    cfSheet.addRow(["Net Cash Flow from Investing Activities", "", "", invIn - invOut]);
    cfSheet.addRow([]);

    cfSheet.addRow(["3. CASH FLOW FROM FINANCING ACTIVITIES", "", "", ""]);
    cfSheet.addRow(["Partner Capital Infusion / (Drawings)", finIn, 0, finIn]);
    cfSheet.addRow(["Business Loans / Vehicle EMI Payments", 0, finOut, -finOut]);
    cfSheet.addRow(["Net Cash Flow from Financing Activities", "", "", finIn - finOut]);
    cfSheet.addRow([]);

    const netTotalCF = (opIn - opOut) + (invIn - invOut) + (finIn - finOut);
    cfSheet.addRow(["NET INCREASE / (DECREASE) IN CASH & BANK", "", "", netTotalCF]);
    cfSheet.addRow(["Opening Cash & Bank Balance", "", "", openingCash]);
    cfSheet.addRow(["CLOSING CASH & BANK BALANCE", "", "", closingCash]);
    cfSheet.addRow(["Cash Flow Statement Balanced Check", "", "", Math.abs(openingCash + netTotalCF - closingCash) < 0.05 ? "BALANCED (100% RECONCILED)" : "DISCREPANCY"]);

    // SHEET 4: Trial Balance
    const tbSheet = workbook.addWorksheet("Trial Balance");
    tbSheet.columns = [
      { header: "Code", key: "code", width: 12 },
      { header: "Account Name", key: "name", width: 35 },
      { header: "Type", key: "type", width: 15 },
      { header: "Total Debit (₹)", key: "dr", width: 18 },
      { header: "Total Credit (₹)", key: "cr", width: 18 },
      { header: "Net Balance (₹)", key: "net", width: 18 },
    ];
    trialBalance.forEach((a) => tbSheet.addRow([a.code, a.name, a.type, a.dr, a.cr, a.net]));
    tbSheet.addRow([
      "TOTAL",
      "Trial Balance Balanced Check",
      "",
      trialBalance.reduce((s, a) => s + a.dr, 0),
      trialBalance.reduce((s, a) => s + a.cr, 0),
      "",
    ]);

    // SHEET 5: Project Profitability
    const prjSheet = workbook.addWorksheet("Project Profitability Matrix");
    prjSheet.columns = [
      { header: "Project Code", key: "code", width: 15 },
      { header: "Project Name", key: "name", width: 30 },
      { header: "Customer", key: "customer", width: 25 },
      { header: "Contract Value (₹)", key: "contract", width: 18 },
      { header: "Invoiced (₹)", key: "inv", width: 16 },
      { header: "Received (₹)", key: "rec", width: 16 },
      { header: "Costs (₹)", key: "costs", width: 16 },
      { header: "Net Margin (₹)", key: "profit", width: 16 },
    ];
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        invoices: { where: { status: { not: "CANCELLED" } } },
        purchaseBills: true,
        expenses: { where: { status: "APPROVED" } },
        contractorMilestones: { where: { status: "APPROVED" } },
      },
    });
    projects.forEach((p) => {
      const inv = p.invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
      const rec = p.invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
      const c1 = p.purchaseBills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const c2 = p.expenses.reduce((s, e) => s + Number(e.amount), 0);
      const c3 = p.contractorMilestones.reduce((s, m) => s + Number(m.milestoneAmount || 0), 0);
      const cost = c1 + c2 + c3;
      prjSheet.addRow([
        p.code,
        p.name,
        p.customer.name,
        Number(p.contractValue),
        inv,
        rec,
        cost,
        inv - cost,
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Standard-Roofs-Financial-Report-2026-27.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
