import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amountPaid: true,
            status: true,
          },
        },
        expenses: {
          where: { status: "APPROVED", isOfficeExpense: false },
          select: { amount: true, purpose: true, category: true, teamName: true },
        },
        purchaseBills: {
          select: { totalAmount: true },
        },
        contractorMilestones: {
          select: { milestoneAmount: true, teamName: true },
        },
        cashBookEntries: {
          where: { isOfficeExpense: false },
          select: { amount: true, type: true, teamName: true },
        },
        vehicleTrips: {
          select: { fuelCost: true, tollCost: true, driverBata: true },
        },
        siteMaterialIssues: {
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = projects.map((prj: any) => {
      const contractValue = toDecimal(prj.contractValue);

      // Invoiced & Received
      let totalInvoiced = toDecimal(0);
      let totalReceived = toDecimal(0);
      prj.invoices.forEach((inv: any) => {
        if (inv.status !== "CANCELLED") {
          totalInvoiced = totalInvoiced.plus(toDecimal(inv.totalAmount));
          totalReceived = totalReceived.plus(toDecimal(inv.amountPaid));
        }
      });

      prj.cashBookEntries.forEach((cb: any) => {
        if (cb.type === "CASH_INFLOW") {
          totalReceived = totalReceived.plus(toDecimal(cb.amount));
        }
      });

      // 5 Direct Cost Categories
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

      prj.contractorMilestones.forEach((cm: any) => {
        contractorCost = contractorCost.plus(toDecimal(cm.milestoneAmount));
      });

      prj.vehicleTrips.forEach((vt: any) => {
        const tripCost = toDecimal(vt.fuelCost).plus(toDecimal(vt.tollCost)).plus(toDecimal(vt.driverBata));
        transportCost = transportCost.plus(tripCost);
      });

      prj.expenses.forEach((exp: any) => {
        const amt = toDecimal(exp.amount);
        const cat = (exp.category || "").toUpperCase();
        if (cat === "MATERIAL") materialCost = materialCost.plus(amt);
        else if (cat === "LABOUR") labourCost = labourCost.plus(amt);
        else if (cat === "CONTRACTOR") contractorCost = contractorCost.plus(amt);
        else if (cat === "TRANSPORT") transportCost = transportCost.plus(amt);
        else foodAndMiscCost = foodAndMiscCost.plus(amt);
      });

      prj.cashBookEntries.forEach((cb: any) => {
        if (cb.type === "CASH_OUTFLOW") {
          foodAndMiscCost = foodAndMiscCost.plus(toDecimal(cb.amount));
        }
      });

      const totalProjectCost = materialCost
        .plus(labourCost)
        .plus(contractorCost)
        .plus(transportCost)
        .plus(foodAndMiscCost);

      const revenueBase = totalReceived.greaterThan(0) ? totalReceived : totalInvoiced;
      const netProfitOrLoss = revenueBase.minus(totalProjectCost);
      const profitMarginPct = revenueBase.isZero()
        ? 0
        : netProfitOrLoss.dividedBy(revenueBase).times(100).toDecimalPlaces(1).toNumber();

      let assignedTeams: string[] = ["SRM01"];
      try {
        if (prj.assignedTeams) assignedTeams = JSON.parse(prj.assignedTeams);
      } catch {
        assignedTeams = ["SRM01"];
      }

      return {
        id: prj.id,
        code: prj.code,
        name: prj.name,
        customer: prj.customer,
        siteLocation: prj.siteLocation,
        city: prj.city,
        state: prj.state,
        roofType: prj.roofType,
        totalSqFt: prj.totalSqFt.toString(),
        contractValue: contractValue.toFixed(2),
        status: prj.status,
        description: prj.description,
        startDate: prj.startDate,
        targetCompletionDate: prj.targetCompletionDate,
        assignedTeams,
        financials: {
          contractValue: contractValue.toFixed(2),
          totalInvoiced: totalInvoiced.toFixed(2),
          totalReceived: totalReceived.toFixed(2),
          unbilledContractAmount: contractValue.minus(totalInvoiced).greaterThan(0)
            ? contractValue.minus(totalInvoiced).toFixed(2)
            : "0.00",
          pendingBalance: (totalInvoiced.greaterThan(0) ? totalInvoiced.minus(totalReceived) : contractValue.minus(totalReceived)).toFixed(2),
          materialCost: materialCost.toFixed(2),
          labourCost: labourCost.toFixed(2),
          contractorCost: contractorCost.toFixed(2),
          transportCost: transportCost.toFixed(2),
          foodAndMiscCost: foodAndMiscCost.toFixed(2),
          totalProjectCost: totalProjectCost.toFixed(2),
          netProfitOrLoss: netProfitOrLoss.toFixed(2),
          profitMarginPct,
          isProfitable: netProfitOrLoss.greaterThanOrEqualTo(0),
        },
      };
    });

    return NextResponse.json({ success: true, projects: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      name,
      siteLocation,
      city = "Erode",
      state = "Tamil Nadu",
      roofType = "PEB",
      totalSqFt = 0,
      contractValue = 0,
      startDate,
      targetCompletionDate,
      description,
      assignedTeams = ["SRM01"],
    } = body;

    if (!customerId || !name || !siteLocation) {
      return NextResponse.json(
        { success: false, error: "Customer, Project Name and Site Location are required." },
        { status: 400 }
      );
    }

    const count = await prisma.project.count();
    const seq = String(count + 1).padStart(3, "0");
    const code = `SR-PRJ-2026-${seq}`;

    const project = await prisma.project.create({
      data: {
        code,
        name,
        customerId,
        siteLocation,
        city,
        state,
        roofType,
        totalSqFt: toDecimal(totalSqFt).toFixed(2),
        contractValue: toDecimal(contractValue).toFixed(2),
        startDate: startDate ? new Date(startDate) : new Date(),
        targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        description,
        assignedTeams: JSON.stringify(assignedTeams),
      },
      include: { customer: true },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
