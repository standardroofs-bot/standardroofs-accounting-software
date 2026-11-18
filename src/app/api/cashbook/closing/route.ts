import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal, toDecimal } from "@/lib/decimal";
import { ClosingStatus } from "@prisma/client";

export async function GET() {
  try {
    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const cashAccount = await prisma.account.findUniqueOrThrow({
      where: { code: "1010" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const closings = await prisma.dailyCashClosing.findMany({
      where: { financialYearId: fy.id },
      orderBy: { closingDate: "desc" },
      take: 30,
      include: {
        closedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      currentCashBalance: toDecimal(cashAccount.currentBalance).toFixed(2),
      closings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      closingDate,
      count500 = 0,
      count200 = 0,
      count100 = 0,
      count50 = 0,
      count20 = 0,
      count10 = 0,
      count5 = 0,
      count2 = 0,
      count1 = 0,
      notes,
    } = body;

    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "System user not found" }, { status: 500 });
    }

    const cashAccount = await prisma.account.findUniqueOrThrow({
      where: { code: "1010" },
    });

    const systemBalance = toDecimal(cashAccount.currentBalance);

    // Calculate Physical Denominations Total
    const total500 = new Decimal(count500).times(500);
    const total200 = new Decimal(count200).times(200);
    const total100 = new Decimal(count100).times(100);
    const total50 = new Decimal(count50).times(50);
    const total20 = new Decimal(count20).times(20);
    const total10 = new Decimal(count10).times(10);
    const total5 = new Decimal(count5).times(5);
    const total2 = new Decimal(count2).times(2);
    const total1 = new Decimal(count1).times(1);

    const physicalTotal = total500
      .plus(total200)
      .plus(total100)
      .plus(total50)
      .plus(total20)
      .plus(total10)
      .plus(total5)
      .plus(total2)
      .plus(total1);

    const discrepancy = physicalTotal.minus(systemBalance);
    const status = discrepancy.abs().lessThan(0.01) ? ClosingStatus.BALANCED : ClosingStatus.DISCREPANCY;

    const parsedClosingDate = closingDate ? new Date(closingDate) : new Date();

    const closing = await prisma.dailyCashClosing.upsert({
      where: {
        closingDate_financialYearId: {
          closingDate: parsedClosingDate,
          financialYearId: fy.id,
        },
      },
      update: {
        systemOpeningBalance: systemBalance.toFixed(2),
        totalInflow: "0.00",
        totalOutflow: "0.00",
        systemClosingBalance: systemBalance.toFixed(2),
        count500: Number(count500),
        count200: Number(count200),
        count100: Number(count100),
        count50: Number(count50),
        count20: Number(count20),
        count10: Number(count10),
        count5: Number(count5),
        count2: Number(count2),
        count1: Number(count1),
        physicalClosingTotal: physicalTotal.toFixed(2),
        discrepancyAmount: discrepancy.toFixed(2),
        status,
        notes: notes || null,
        closedById: defaultUser.id,
      },
      create: {
        closingDate: parsedClosingDate,
        systemOpeningBalance: systemBalance.toFixed(2),
        totalInflow: "0.00",
        totalOutflow: "0.00",
        systemClosingBalance: systemBalance.toFixed(2),
        count500: Number(count500),
        count200: Number(count200),
        count100: Number(count100),
        count50: Number(count50),
        count20: Number(count20),
        count10: Number(count10),
        count5: Number(count5),
        count2: Number(count2),
        count1: Number(count1),
        physicalClosingTotal: physicalTotal.toFixed(2),
        discrepancyAmount: discrepancy.toFixed(2),
        status,
        notes: notes || null,
        closedById: defaultUser.id,
        financialYearId: fy.id,
      },
    });

    return NextResponse.json({
      success: true,
      closing,
      physicalTotal: physicalTotal.toFixed(2),
      systemBalance: systemBalance.toFixed(2),
      discrepancy: discrepancy.toFixed(2),
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
