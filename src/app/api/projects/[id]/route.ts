import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        invoices: {
          include: { payments: true, items: true },
          orderBy: { date: "asc" },
        },
        expenses: {
          include: { account: true },
          orderBy: { date: "asc" },
        },
        purchaseBills: {
          include: { supplier: true, items: true },
          orderBy: { date: "asc" },
        },
        contractorMilestones: {
          include: { contractor: true },
          orderBy: { createdAt: "asc" },
        },
        cashBookEntries: {
          orderBy: { date: "asc" },
        },
        vehicleTrips: {
          include: { vehicle: true, driver: true },
          orderBy: { date: "asc" },
        },
        siteMaterialIssues: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project site not found" }, { status: 404 });
    }

    const prj: any = project;

    // Revenue calculations
    const contractValue = toDecimal(prj.contractValue);
    let totalBilled = toDecimal(0);
    let totalReceived = toDecimal(0);

    prj.invoices.forEach((inv: any) => {
      if (inv.status !== "CANCELLED") {
        totalBilled = totalBilled.plus(toDecimal(inv.totalAmount));
        totalReceived = totalReceived.plus(toDecimal(inv.amountPaid));
      }
    });

    // Inflows from CashBook
    prj.cashBookEntries.forEach((cb: any) => {
      if (cb.type === "CASH_INFLOW") {
        totalReceived = totalReceived.plus(toDecimal(cb.amount));
      }
    });

    const pendingBalance = totalBilled.greaterThan(0)
      ? totalBilled.minus(totalReceived)
      : contractValue.minus(totalReceived);

    // Direct Cost Breakdown
    let materialCost = toDecimal(0);
    prj.purchaseBills.forEach((pb: any) => {
      materialCost = materialCost.plus(toDecimal(pb.totalAmount));
    });
    prj.siteMaterialIssues.forEach((smi: any) => {
      materialCost = materialCost.plus(toDecimal(smi.quantity).times(250));
    });

    let labourCost = toDecimal(0);
    let contractorCost = toDecimal(0);
    let transportCost = toDecimal(0);
    let foodAndMiscCost = toDecimal(0);

    const teamBreakdown: Record<string, number> = {};

    // Group contractor milestones
    prj.contractorMilestones.forEach((cm: any) => {
      const amt = toDecimal(cm.milestoneAmount);
      contractorCost = contractorCost.plus(amt);
      const team = cm.teamName || "SRM01";
      teamBreakdown[team] = (teamBreakdown[team] || 0) + amt.toNumber();
    });

    // Group vehicle trips
    prj.vehicleTrips.forEach((vt: any) => {
      const tripCost = toDecimal(vt.fuelCost).plus(toDecimal(vt.tollCost)).plus(toDecimal(vt.driverBata));
      transportCost = transportCost.plus(tripCost);
      const team = "Fleet Bolero";
      teamBreakdown[team] = (teamBreakdown[team] || 0) + tripCost.toNumber();
    });

    // Group direct site expenses
    prj.expenses.forEach((exp: any) => {
      if (exp.isOfficeExpense) return; // Exclude office overheads!
      const amt = toDecimal(exp.amount);
      const cat = (exp.category || "").toUpperCase();
      const team = exp.teamName || "SRM01";
      teamBreakdown[team] = (teamBreakdown[team] || 0) + amt.toNumber();

      if (cat === "MATERIAL") {
        materialCost = materialCost.plus(amt);
      } else if (cat === "LABOUR") {
        labourCost = labourCost.plus(amt);
      } else if (cat === "CONTRACTOR") {
        contractorCost = contractorCost.plus(amt);
      } else if (cat === "TRANSPORT") {
        transportCost = transportCost.plus(amt);
      } else {
        foodAndMiscCost = foodAndMiscCost.plus(amt);
      }
    });

    // Cashbook site expenses
    prj.cashBookEntries.forEach((cb: any) => {
      if (cb.type === "CASH_OUTFLOW" && !cb.isOfficeExpense) {
        const amt = toDecimal(cb.amount);
        foodAndMiscCost = foodAndMiscCost.plus(amt);
        const team = cb.teamName || "Site Cash";
        teamBreakdown[team] = (teamBreakdown[team] || 0) + amt.toNumber();
      }
    });

    const totalProjectCost = materialCost
      .plus(labourCost)
      .plus(contractorCost)
      .plus(transportCost)
      .plus(foodAndMiscCost);

    // Site Profit: Based on client collections or billed revenue
    const revenueBase = totalReceived.greaterThan(0) ? totalReceived : totalBilled;
    const netSiteProfit = revenueBase.minus(totalProjectCost);
    const marginPct = revenueBase.isZero()
      ? 0
      : netSiteProfit.dividedBy(revenueBase).times(100).toDecimalPlaces(1).toNumber();

    // Chronological Passbook / Transaction Ledger
    const ledgerEntries: any[] = [];

    // Add Invoices / Inflows
    prj.invoices.forEach((inv: any) => {
      ledgerEntries.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        voucherNo: inv.invoiceNumber,
        category: "Customer Tax Invoice",
        team: "Sales",
        particulars: `Tax Invoice for Roofing Work (${inv.status})`,
        paymentMode: "Bill",
        inflow: toDecimal(inv.totalAmount).toNumber(),
        outflow: 0,
      });

      inv.payments.forEach((p: any) => {
        ledgerEntries.push({
          id: `pay-${p.id}`,
          date: p.paymentDate,
          voucherNo: p.referenceNumber || inv.invoiceNumber,
          category: "Client Payment Received",
          team: "Customer",
          particulars: `Payment against ${inv.invoiceNumber} via ${p.paymentMode}`,
          paymentMode: p.paymentMode,
          inflow: toDecimal(p.amount).toNumber(),
          outflow: 0,
        });
      });
    });

    // Add Cash Inflows
    prj.cashBookEntries.forEach((cb: any) => {
      if (cb.type === "CASH_INFLOW") {
        ledgerEntries.push({
          id: `cb-in-${cb.id}`,
          date: cb.date,
          voucherNo: cb.voucherNumber,
          category: "Cash Receipt",
          team: cb.teamName || "Site",
          particulars: cb.purpose,
          paymentMode: "Cash",
          inflow: toDecimal(cb.amount).toNumber(),
          outflow: 0,
        });
      }
    });

    // Add Purchase Bills
    prj.purchaseBills.forEach((pb: any) => {
      ledgerEntries.push({
        id: `pb-${pb.id}`,
        date: pb.date,
        voucherNo: pb.billNumber,
        category: "Steel & Raw Material Bill",
        team: "Procurement",
        particulars: `Material from ${pb.supplier.name}`,
        paymentMode: "Bill",
        inflow: 0,
        outflow: toDecimal(pb.totalAmount).toNumber(),
      });
    });

    // Add Contractor Milestones
    prj.contractorMilestones.forEach((cm: any) => {
      ledgerEntries.push({
        id: `cm-${cm.id}`,
        date: cm.approvedDate || cm.createdAt,
        voucherNo: cm.contractor.code || "CON-VCH",
        category: "Contractor Milestone Payout",
        team: cm.teamName || "Subcontractor",
        particulars: `${cm.contractor.name} - ${cm.workStageDescription}`,
        paymentMode: "Bank/Cash",
        inflow: 0,
        outflow: toDecimal(cm.milestoneAmount).toNumber(),
      });
    });

    // Add Site Expenses
    prj.expenses.forEach((exp: any) => {
      if (exp.isOfficeExpense) return;
      ledgerEntries.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        voucherNo: exp.voucherNumber,
        category: exp.category || "Site Expense",
        team: exp.teamName || "Site Gang",
        particulars: exp.purpose,
        paymentMode: exp.paymentMode,
        inflow: 0,
        outflow: toDecimal(exp.amount).toNumber(),
      });
    });

    // Add Cash Outflows
    prj.cashBookEntries.forEach((cb: any) => {
      if (cb.type === "CASH_OUTFLOW" && !cb.isOfficeExpense) {
        ledgerEntries.push({
          id: `cb-out-${cb.id}`,
          date: cb.date,
          voucherNo: cb.voucherNumber,
          category: "Site Cash Expense",
          team: cb.teamName || "Site Gang",
          particulars: cb.purpose,
          paymentMode: "Cash",
          inflow: 0,
          outflow: toDecimal(cb.amount).toNumber(),
        });
      }
    });

    // Add Vehicle Trips
    prj.vehicleTrips.forEach((vt: any) => {
      const tripCost = toDecimal(vt.fuelCost).plus(toDecimal(vt.tollCost)).plus(toDecimal(vt.driverBata));
      ledgerEntries.push({
        id: `vt-${vt.id}`,
        date: vt.date,
        voucherNo: vt.tripNumber,
        category: "Vehicle Diesel & Transport",
        team: "Fleet",
        particulars: `${vt.vehicle.registrationNumber} (Driver: ${vt.driver.name}) - ${vt.fromLocation} to ${vt.toLocation}`,
        paymentMode: "Fuel/Cash",
        inflow: 0,
        outflow: tripCost.toNumber(),
      });
    });

    // Sort ledger by date ascending and calculate running balance
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBal = 0;
    const passbook = ledgerEntries.map((e) => {
      runningBal = runningBal + e.inflow - e.outflow;
      return {
        ...e,
        dateFormatted: new Date(e.date).toISOString().split("T")[0],
        runningBalance: runningBal,
      };
    });

    let assignedTeamsList: string[] = ["SRM01"];
    try {
      if (prj.assignedTeams) {
        assignedTeamsList = JSON.parse(prj.assignedTeams);
      }
    } catch {
      assignedTeamsList = ["SRM01"];
    }

    return NextResponse.json({
      success: true,
      project: {
        id: prj.id,
        code: prj.code,
        name: prj.name,
        customer: prj.customer,
        siteLocation: prj.siteLocation,
        city: prj.city,
        state: prj.state,
        roofType: prj.roofType,
        totalSqFt: Number(prj.totalSqFt),
        contractValue: contractValue.toFixed(2),
        status: prj.status,
        description: prj.description,
        assignedTeams: assignedTeamsList,
        financials: {
          contractValue: contractValue.toFixed(2),
          totalBilled: totalBilled.toFixed(2),
          totalReceived: totalReceived.toFixed(2),
          pendingBalance: pendingBalance.toFixed(2),
          materialCost: materialCost.toFixed(2),
          labourCost: labourCost.toFixed(2),
          contractorCost: contractorCost.toFixed(2),
          transportCost: transportCost.toFixed(2),
          foodAndMiscCost: foodAndMiscCost.toFixed(2),
          totalProjectCost: totalProjectCost.toFixed(2),
          netSiteProfit: netSiteProfit.toFixed(2),
          marginPct,
          isProfitable: netSiteProfit.greaterThanOrEqualTo(0),
        },
        teamBreakdown,
        passbook,
      },
    });
  } catch (error: any) {
    console.error("Project Site P&L Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, assignedTeams, status, contractValue, siteLocation, roofType, totalSqFt, description } = body;

    const data: any = {};
    if (name) data.name = name;
    if (assignedTeams) data.assignedTeams = JSON.stringify(assignedTeams);
    if (status) data.status = status;
    if (contractValue !== undefined) data.contractValue = toDecimal(contractValue).toFixed(2);
    if (siteLocation) data.siteLocation = siteLocation;
    if (roofType) data.roofType = roofType;
    if (totalSqFt !== undefined) data.totalSqFt = toDecimal(totalSqFt).toFixed(2);
    if (description !== undefined) data.description = description;

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: { customer: true },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
