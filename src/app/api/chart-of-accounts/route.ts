import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountType, AccountSubType } from "@prisma/client";
import { toDecimal } from "@/lib/decimal";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: [{ type: "asc" }, { code: "asc" }],
      include: {
        parentAccount: { select: { id: true, name: true, code: true } },
      },
    });

    // Compute summaries by AccountType
    const summaries = {
      ASSET: accounts.filter((a) => a.type === AccountType.ASSET).reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0)),
      LIABILITY: accounts.filter((a) => a.type === AccountType.LIABILITY).reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0)),
      EQUITY: accounts.filter((a) => a.type === AccountType.EQUITY).reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0)),
      INCOME: accounts.filter((a) => a.type === AccountType.INCOME).reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0)),
      EXPENSE: accounts.filter((a) => a.type === AccountType.EXPENSE).reduce((sum, a) => sum.plus(toDecimal(a.currentBalance)), toDecimal(0)),
    };

    return NextResponse.json({
      success: true,
      accounts,
      summaries: {
        ASSET: summaries.ASSET.toFixed(2),
        LIABILITY: summaries.LIABILITY.toFixed(2),
        EQUITY: summaries.EQUITY.toFixed(2),
        INCOME: summaries.INCOME.toFixed(2),
        EXPENSE: summaries.EXPENSE.toFixed(2),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, type, subType, description, openingBalance, parentAccountId } = body;

    if (!code || !name || !type || !subType) {
      return NextResponse.json(
        { success: false, error: "Code, Name, Type and SubType are required" },
        { status: 400 }
      );
    }

    const opBal = toDecimal(openingBalance);

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type: type as AccountType,
        subType: subType as AccountSubType,
        description,
        openingBalance: opBal.toFixed(2),
        currentBalance: opBal.toFixed(2),
        parentAccountId: parentAccountId || null,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
