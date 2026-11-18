import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Date filters for transactions
    const dateWhere: any = {};
    if (startDate) dateWhere.gte = new Date(startDate);
    if (endDate) dateWhere.lte = new Date(endDate);

    // 1. Fetch All Accounts with Lines
    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          where: Object.keys(dateWhere).length ? { journalEntry: { date: dateWhere } } : undefined,
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: "asc" },
    });

    // Compute live debit/credit and net balances
    const trialBalance = accounts.map((acc) => {
      let totalDr = toDecimal(0);
      let totalCr = toDecimal(0);

      acc.journalLines.forEach((l) => {
        totalDr = totalDr.plus(toDecimal(l.debit));
        totalCr = totalCr.plus(toDecimal(l.credit));
      });

      // Normal balance: Asset & Expense = Dr - Cr; Liability, Equity, Income = Cr - Dr
      let netBalance = toDecimal(0);
      if (acc.type === "ASSET" || acc.type === "EXPENSE") {
        netBalance = totalDr.minus(totalCr);
      } else {
        netBalance = totalCr.minus(totalDr);
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        openingBalance: Number(acc.openingBalance || 0),
        totalDebit: totalDr.toNumber(),
        totalCredit: totalCr.toNumber(),
        netBalance: netBalance.toNumber(),
      };
    });

    const sumDr = trialBalance.reduce((s, a) => s + a.totalDebit, 0);
    const sumCr = trialBalance.reduce((s, a) => s + a.totalCredit, 0);

    // 2. Profit & Loss
    const incomeAccounts = trialBalance.filter((a) => a.type === "INCOME");
    const expenseAccounts = trialBalance.filter((a) => a.type === "EXPENSE");

    const totalIncome = incomeAccounts.reduce((s, a) => s + a.netBalance, 0);
    const totalExpense = expenseAccounts.reduce((s, a) => s + a.netBalance, 0);
    const netProfitOrLoss = totalIncome - totalExpense;

    // 3. Balance Sheet
    const assetAccounts = trialBalance.filter((a) => a.type === "ASSET");
    const liabilityAccounts = trialBalance.filter((a) => a.type === "LIABILITY");
    const equityAccounts = trialBalance.filter((a) => a.type === "EQUITY");

    const totalAssets = assetAccounts.reduce((s, a) => s + a.netBalance, 0);
    const totalLiabilities = liabilityAccounts.reduce((s, a) => s + a.netBalance, 0);
    const totalEquity = equityAccounts.reduce((s, a) => s + a.netBalance, 0);
    const totalLiabAndEquity = totalLiabilities + totalEquity + netProfitOrLoss;

    // 4. Project-Wise Profitability
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        invoices: {
          where: { status: { not: "CANCELLED" } },
          select: { totalAmount: true, amountPaid: true, subTotal: true },
        },
        purchaseBills: { select: { totalAmount: true } },
        expenses: {
          where: { status: "APPROVED" },
          select: { amount: true },
        },
        contractorMilestones: { select: { milestoneAmount: true } },
      },
      orderBy: { code: "asc" },
    });

    const projectComparison = projects.map((prj) => {
      const contractVal = Number(prj.contractValue || 0);
      const totalInvoiced = prj.invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
      const totalCollected = prj.invoices.reduce((s, i) => s + Number(i.amountPaid), 0);

      const materialCost = prj.purchaseBills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const siteExpenseCost = prj.expenses.reduce((s, e) => s + Number(e.amount), 0);
      const contractorCost = prj.contractorMilestones.reduce((s, m) => s + Number(m.milestoneAmount), 0);

      const totalProjectCost = materialCost + siteExpenseCost + contractorCost;
      const netProfit = totalInvoiced - totalProjectCost;
      const marginPct = totalInvoiced > 0 ? (netProfit / totalInvoiced) * 100 : 0;

      return {
        id: prj.id,
        code: prj.code,
        name: prj.name,
        customerName: prj.customer.name,
        roofType: prj.roofType,
        totalSqFt: Number(prj.totalSqFt || 0),
        contractVal,
        totalInvoiced,
        totalCollected,
        outstandingAR: totalInvoiced - totalCollected,
        materialCost,
        labourCost: 0,
        contractorCost,
        siteExpenseCost,
        totalProjectCost,
        netProfit,
        marginPct: Number(marginPct.toFixed(1)),
      };
    });

    // 5. GST Reports (GSTR-1 and GSTR-3B)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { not: "CANCELLED" },
        date: Object.keys(dateWhere).length ? dateWhere : undefined,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    let gstr1Taxable = 0;
    let gstr1CGST = 0;
    let gstr1SGST = 0;
    let gstr1IGST = 0;
    let gstr1Total = 0;

    invoices.forEach((inv) => {
      gstr1Taxable += Number(inv.subTotal);
      gstr1CGST += Number(inv.cgstTotal);
      gstr1SGST += Number(inv.sgstTotal);
      gstr1IGST += Number(inv.igstTotal);
      gstr1Total += Number(inv.totalAmount);
    });

    // Inward purchases for ITC (GSTR-3B)
    const purchases = await prisma.purchaseBill.findMany({
      where: {
        status: { not: "CANCELLED" },
        date: Object.keys(dateWhere).length ? dateWhere : undefined,
      },
    });

    let itcCGST = 0;
    let itcSGST = 0;
    let itcIGST = 0;
    let itcTaxable = 0;

    purchases.forEach((p) => {
      itcTaxable += Number(p.subTotal);
      itcCGST += Number(p.cgstTotal);
      itcSGST += Number(p.sgstTotal);
      itcIGST += Number(p.igstTotal);
    });

    const netPayableCGST = Math.max(0, gstr1CGST - itcCGST);
    const netPayableSGST = Math.max(0, gstr1SGST - itcSGST);
    const netPayableIGST = Math.max(0, gstr1IGST - itcIGST);
    const totalNetGSTPayable = netPayableCGST + netPayableSGST + netPayableIGST;

    // 6. Cash Flow Statement (Strict Double-Entry Direct Reconciliation)
    const cashBankAccs = trialBalance.filter(
      (a) => a.code === "1010" || a.code.startsWith("102") || a.subType === "CASH" || a.subType === "BANK"
    );
    const cashBankIds = new Set(cashBankAccs.map((a) => a.id));

    const openingCashAndBank = cashBankAccs.reduce((s, a) => s + (a.openingBalance || 0), 0);
    const closingCashAndBank = cashBankAccs.reduce((s, a) => s + a.netBalance, 0);

    // Fetch journal entries with lines touching cash/bank
    const cashJournals = await prisma.journalEntry.findMany({
      where: {
        date: Object.keys(dateWhere).length ? dateWhere : undefined,
        status: "POSTED",
        lines: {
          some: {
            accountId: { in: Array.from(cashBankIds) },
          },
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    let operatingInflows = 0;
    let operatingOutflows = 0;
    let investingInflows = 0;
    let investingOutflows = 0;
    let financingInflows = 0;
    let financingOutflows = 0;

    cashJournals.forEach((j) => {
      // Calculate net cash movement for this entry
      let netCash = 0;
      j.lines.forEach((l) => {
        if (cashBankIds.has(l.accountId)) {
          netCash += Number(l.debit) - Number(l.credit);
        }
      });

      if (Math.abs(netCash) < 0.001) return; // Pure internal transfer (e.g. Contra between cash & bank)

      // Identify activity
      const hasEquity = j.lines.some((l) => l.account.type === "EQUITY" || l.account.code.startsWith("30"));
      const hasLoan = j.lines.some((l) => l.account.code === "2060" || l.account.code === "2061" || l.account.code === "5100");
      const hasFixedAsset = j.lines.some((l) => l.account.code.startsWith("15"));

      if (hasEquity || hasLoan || j.voucherType === "CAPITAL_TRANSACTION" || j.voucherType === "LOAN_DISBURSEMENT" || j.voucherType === "LOAN_EMI") {
        if (netCash > 0) financingInflows += netCash;
        else financingOutflows += Math.abs(netCash);
      } else if (hasFixedAsset || j.voucherType === "FIXED_ASSET_ACQUISITION") {
        if (netCash > 0) investingInflows += netCash;
        else investingOutflows += Math.abs(netCash);
      } else {
        // Operating activities
        if (netCash > 0) operatingInflows += netCash;
        else operatingOutflows += Math.abs(netCash);
      }
    });

    const netOperatingCashFlow = operatingInflows - operatingOutflows;
    const netInvestingCashFlow = investingInflows - investingOutflows;
    const netFinancingCashFlow = financingInflows - financingOutflows;
    const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    const cashFlowStatement = {
      openingCashAndBank,
      operatingActivities: {
        inflows: operatingInflows,
        outflows: operatingOutflows,
        net: netOperatingCashFlow,
      },
      investingActivities: {
        inflows: investingInflows,
        outflows: investingOutflows,
        net: netInvestingCashFlow,
      },
      financingActivities: {
        inflows: financingInflows,
        outflows: financingOutflows,
        net: netFinancingCashFlow,
      },
      netCashFlow,
      closingCashAndBank,
      isReconciled: Math.abs(openingCashAndBank + netCashFlow - closingCashAndBank) < 0.05,
    };

    // Executive Site vs. Office P&L Summary
    const totalInvoicedTotal = projectComparison.reduce((s, p) => s + p.totalInvoiced, 0);
    const totalCollectedTotal = projectComparison.reduce((s, p) => s + p.totalCollected, 0);
    const totalDirectCostsTotal = projectComparison.reduce((s, p) => s + p.totalProjectCost, 0);
    const officeOverheadAccounts = expenseAccounts.filter((a) => a.code.startsWith("60") || a.code.startsWith("6"));
    const totalOfficeOverheads = officeOverheadAccounts.reduce((s, a) => s + a.netBalance, 0);

    const siteVsOfficePnL = {
      totalSiteRevenue: totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal,
      totalDirectSiteCosts: totalDirectCostsTotal,
      grossSiteProfit: (totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) - totalDirectCostsTotal,
      grossSiteMarginPct: (totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) > 0
        ? Number(((((totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) - totalDirectCostsTotal) / (totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal)) * 100).toFixed(1))
        : 0,
      totalOfficeOverheads,
      netCompanyProfit: ((totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) - totalDirectCostsTotal) - totalOfficeOverheads,
      netCompanyMarginPct: (totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) > 0
        ? Number((((((totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) - totalDirectCostsTotal) - totalOfficeOverheads) / (totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal)) * 100).toFixed(1))
        : 0,
      isCompanyProfitable: (((totalInvoicedTotal > 0 ? totalInvoicedTotal : totalCollectedTotal) - totalDirectCostsTotal) - totalOfficeOverheads) >= 0,
    };

    return NextResponse.json({
      success: true,
      siteVsOfficePnL,
      trialBalance: {
        accounts: trialBalance,
        sumDebit: sumDr,
        sumCredit: sumCr,
        isBalanced: Math.abs(sumDr - sumCr) < 0.01,
      },
      pnl: {
        incomeAccounts,
        expenseAccounts,
        totalIncome,
        totalExpense,
        netProfitOrLoss,
      },
      balanceSheet: {
        assetAccounts,
        liabilityAccounts,
        equityAccounts,
        totalAssets,
        totalLiabilities,
        totalEquity,
        currentYearSurplus: netProfitOrLoss,
        totalLiabAndEquity,
        isBalanced: Math.abs(totalAssets - totalLiabAndEquity) < 0.05,
      },
      cashFlow: cashFlowStatement,
      projectComparison,
      gst: {
        gstr1: {
          invoiceCount: invoices.length,
          taxableAmount: gstr1Taxable,
          cgst: gstr1CGST,
          sgst: gstr1SGST,
          igst: gstr1IGST,
          totalTax: gstr1CGST + gstr1SGST + gstr1IGST,
          totalValue: gstr1Total,
          invoices: invoices.map((i) => ({
            invoiceNumber: i.invoiceNumber,
            date: i.date,
            customerName: i.customer.name,
            customerGstin: i.customer.gstNumber,
            stateCode: i.customer.stateCode,
            taxable: Number(i.subTotal),
            cgst: Number(i.cgstTotal),
            sgst: Number(i.sgstTotal),
            igst: Number(i.igstTotal),
            total: Number(i.totalAmount),
          })),
        },
        gstr3b: {
          outputTax: {
            taxable: gstr1Taxable,
            cgst: gstr1CGST,
            sgst: gstr1SGST,
            igst: gstr1IGST,
          },
          itcAvailable: {
            taxable: itcTaxable,
            cgst: itcCGST,
            sgst: itcSGST,
            igst: itcIGST,
          },
          netPayable: {
            cgst: netPayableCGST,
            sgst: netPayableSGST,
            igst: netPayableIGST,
            total: totalNetGSTPayable,
          },
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
