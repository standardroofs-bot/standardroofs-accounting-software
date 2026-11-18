import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucherType = searchParams.get("type"); // PAYMENT, RECEIPT, CONTRA, JOURNAL_VOUCHER, etc.

    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const whereClause: any = { financialYearId: fy.id };
    if (voucherType) {
      whereClause.voucherType = voucherType as VoucherType;
    }

    const vouchers = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
            project: { select: { id: true, name: true, code: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        reversalOf: { select: { id: true, entryNumber: true } },
        reversedBy: { select: { id: true, entryNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, vouchers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      voucherType = VoucherType.JOURNAL_VOUCHER,
      date,
      narration,
      referenceNumber,
      lines, // Array of { accountId, debit, credit, narration, projectId }
    } = body;

    if (!narration || !lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "Narration and at least 2 journal lines are required for double-entry." },
        { status: 400 }
      );
    }

    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "System user not found" }, { status: 500 });
    }

    // Determine sequence prefix based on voucher type
    let seqKey = "JOURNAL_VOUCHER";
    if (voucherType === VoucherType.PAYMENT) seqKey = "CASH_PAYMENT";
    else if (voucherType === VoucherType.RECEIPT) seqKey = "CASH_RECEIPT";
    else if (voucherType === VoucherType.CONTRA) seqKey = "CONTRA";

    const voucherInfo = await getNextVoucherNumber(fy.id, seqKey);

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: voucherType as VoucherType,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: date ? new Date(date) : new Date(),
      narration,
      referenceNumber,
      createdById: defaultUser.id,
      lines,
    });

    return NextResponse.json({
      success: true,
      voucher: journalEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
