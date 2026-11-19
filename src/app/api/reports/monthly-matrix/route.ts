import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal, formatINR } from "@/lib/decimal";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fyYear = parseInt(searchParams.get("fy") || "2026", 10);

    // Months of the Indian Financial Year (April FY to March FY+1)
    const monthConfigs = [
      { name: "Apr", fullName: `Apr ${fyYear}`, start: new Date(fyYear, 3, 1), end: new Date(fyYear, 3, 30, 23, 59, 59) },
      { name: "May", fullName: `May ${fyYear}`, start: new Date(fyYear, 4, 1), end: new Date(fyYear, 4, 31, 23, 59, 59) },
      { name: "Jun", fullName: `Jun ${fyYear}`, start: new Date(fyYear, 5, 1), end: new Date(fyYear, 5, 30, 23, 59, 59) },
      { name: "Jul", fullName: `Jul ${fyYear}`, start: new Date(fyYear, 6, 1), end: new Date(fyYear, 6, 31, 23, 59, 59) },
      { name: "Aug", fullName: `Aug ${fyYear}`, start: new Date(fyYear, 7, 1), end: new Date(fyYear, 7, 31, 23, 59, 59) },
      { name: "Sep", fullName: `Sep ${fyYear}`, start: new Date(fyYear, 8, 1), end: new Date(fyYear, 8, 30, 23, 59, 59) },
      { name: "Oct", fullName: `Oct ${fyYear}`, start: new Date(fyYear, 9, 1), end: new Date(fyYear, 9, 31, 23, 59, 59) },
      { name: "Nov", fullName: `Nov ${fyYear}`, start: new Date(fyYear, 10, 1), end: new Date(fyYear, 10, 30, 23, 59, 59) },
      { name: "Dec", fullName: `Dec ${fyYear}`, start: new Date(fyYear, 11, 1), end: new Date(fyYear, 11, 31, 23, 59, 59) },
      { name: "Jan", fullName: `Jan ${fyYear + 1}`, start: new Date(fyYear + 1, 0, 1), end: new Date(fyYear + 1, 0, 31, 23, 59, 59) },
      { name: "Feb", fullName: `Feb ${fyYear + 1}`, start: new Date(fyYear + 1, 1, 1), end: new Date(fyYear + 1, 1, 28, 23, 59, 59) },
      { name: "Mar", fullName: `Mar ${fyYear + 1}`, start: new Date(fyYear + 1, 2, 1), end: new Date(fyYear + 1, 2, 31, 23, 59, 59) },
    ];

    // Fetch all journal lines with accounts and entries
    const journalLines = await prisma.journalLine.findMany({
      include: {
        account: true,
        journalEntry: true,
      },
      where: {
        journalEntry: {
          status: "POSTED",
        },
      },
    });

    let runningCashBank = toDecimal(0);
    const monthsData = [];

    let totalRevenue = toDecimal(0);
    let totalDirectCosts = toDecimal(0);
    let totalOfficeOverheads = toDecimal(0);
    let totalNetProfit = toDecimal(0);

    for (const m of monthConfigs) {
      const openingCashBank = runningCashBank;

      // Filter lines in this month
      const linesInMonth = journalLines.filter((jl) => {
        const d = new Date(jl.journalEntry.date);
        return d >= m.start && d <= m.end;
      });

      let rev = toDecimal(0);
      let direct = toDecimal(0);
      let office = toDecimal(0);
      let netCashMovement = toDecimal(0);

      linesInMonth.forEach((l) => {
        const debit = toDecimal(l.debit);
        const credit = toDecimal(l.credit);
        const code = l.account.code;

        // Revenue (4xxx)
        if (code.startsWith("4")) {
          rev = rev.plus(credit.minus(debit));
        }
        // Direct Site Costs (5xxx)
        else if (code.startsWith("5")) {
          direct = direct.plus(debit.minus(credit));
        }
        // Office Overheads (6xxx)
        else if (code.startsWith("6")) {
          office = office.plus(debit.minus(credit));
        }

        // Cash / Bank movement (1010, 1020, 1025)
        if (["1010", "1020", "1025"].includes(code)) {
          netCashMovement = netCashMovement.plus(debit.minus(credit));
        }
      });

      const grossProfit = rev.minus(direct);
      const netProfit = grossProfit.minus(office);
      const closingCashBank = openingCashBank.plus(netCashMovement);

      runningCashBank = closingCashBank;

      totalRevenue = totalRevenue.plus(rev);
      totalDirectCosts = totalDirectCosts.plus(direct);
      totalOfficeOverheads = totalOfficeOverheads.plus(office);
      totalNetProfit = totalNetProfit.plus(netProfit);

      monthsData.push({
        key: m.name,
        fullName: m.fullName,
        openingCashBank: openingCashBank.toNumber(),
        revenue: rev.toNumber(),
        directSiteCosts: direct.toNumber(),
        grossSiteProfit: grossProfit.toNumber(),
        officeOverheads: office.toNumber(),
        netProfitLoss: netProfit.toNumber(),
        closingCashBank: closingCashBank.toNumber(),
      });
    }

    return NextResponse.json({
      success: true,
      fy: `FY ${fyYear}-${(fyYear + 1).toString().slice(2)}`,
      months: monthsData,
      totals: {
        revenue: totalRevenue.toNumber(),
        directSiteCosts: totalDirectCosts.toNumber(),
        grossSiteProfit: totalRevenue.minus(totalDirectCosts).toNumber(),
        officeOverheads: totalOfficeOverheads.toNumber(),
        netProfitLoss: totalNetProfit.toNumber(),
        finalCashBank: runningCashBank.toNumber(),
      },
    });
  } catch (error: any) {
    console.error("GET /api/reports/monthly-matrix error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
