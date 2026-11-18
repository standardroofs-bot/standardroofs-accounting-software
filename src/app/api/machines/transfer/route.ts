import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      machineId,
      fromGroup, // OFFICE, SRM01..SRM06, SPARE, SERVICE, SCRAP
      toGroup,   // OFFICE, SRM01..SRM06, SPARE, SERVICE, SCRAP
      qty = 1,
      purpose,
      serviceVendor,
      faultDescription,
      repairCost = 0,
      postExpenseVoucher = false,
      notes,
    } = body;

    if (!machineId || !fromGroup || !toGroup) {
      return NextResponse.json(
        { success: false, error: "Machine ID, source group and destination group are required." },
        { status: 400 }
      );
    }

    const machine = await prisma.machineAsset.findUniqueOrThrow({ where: { id: machineId } });
    const defaultUser = await prisma.user.findFirstOrThrow();
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    const transferQty = Math.max(1, Number(qty) || 1);

    // Map group name to column name
    const groupKeyMap: Record<string, keyof typeof machine> = {
      OFFICE: "officeCount",
      SRM01: "srm01Count",
      SRM02: "srm02Count",
      SRM03: "srm03Count",
      SMR03: "srm03Count",
      SRM04: "srm04Count",
      SRM05: "srm05Count",
      SRM06: "srm06Count",
      SPARE: "spareCount",
      SERVICE: "serviceCount",
      SCRAP: "scrapCount",
    };

    const fromCol = groupKeyMap[fromGroup.toUpperCase()];
    const toCol = groupKeyMap[toGroup.toUpperCase()];

    if (!fromCol || !toCol) {
      return NextResponse.json({ success: false, error: "Invalid source or destination group." }, { status: 400 });
    }

    const currentFromCount = (machine[fromCol] as number) || 0;
    if (currentFromCount < transferQty) {
      return NextResponse.json(
        { success: false, error: `Insufficient quantity in ${fromGroup}. Current available: ${currentFromCount}, requested: ${transferQty}` },
        { status: 400 }
      );
    }

    const newFromCount = currentFromCount - transferQty;
    const currentToCount = (machine[toCol] as number) || 0;
    const newToCount = currentToCount + transferQty;

    // Optional double-entry posting if moving to/from SERVICE with repair cost
    let journalEntryId: string | null = null;
    const repairAmount = toDecimal(repairCost);

    if (postExpenseVoucher && repairAmount.greaterThan(0)) {
      const repairExpenseAccount = await prisma.account.findUniqueOrThrow({ where: { code: "6060" } }); // Machinery Repairs
      const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } }); // Cash in Hand

      const voucherInfo = await getNextVoucherNumber(fy.id, "EXPENSE");
      const journalEntry = await postDoubleEntryTransaction({
        voucherType: VoucherType.EXPENSE,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Machine Repair [${machine.name}]: ${faultDescription || "Maintenance"} paid to ${serviceVendor || "Local Workshop"}`,
        createdById: defaultUser.id,
        lines: [
          {
            accountId: repairExpenseAccount.id,
            debit: repairAmount,
            credit: 0,
            narration: `Repair charge for ${machine.name} (${machine.assetCode})`,
          },
          {
            accountId: cashAccount.id,
            debit: 0,
            credit: repairAmount,
            narration: `Cash payout for repair of ${machine.name}`,
          },
        ],
      });
      journalEntryId = journalEntry.id;
    }

    // Update machine counts
    const updatedData: any = {
      [fromCol]: newFromCount,
      [toCol]: newToCount,
    };

    // Recalculate totals
    const off = fromCol === "officeCount" ? newFromCount : toCol === "officeCount" ? newToCount : machine.officeCount;
    const s1 = fromCol === "srm01Count" ? newFromCount : toCol === "srm01Count" ? newToCount : machine.srm01Count;
    const s2 = fromCol === "srm02Count" ? newFromCount : toCol === "srm02Count" ? newToCount : machine.srm02Count;
    const s3 = fromCol === "srm03Count" ? newFromCount : toCol === "srm03Count" ? newToCount : machine.srm03Count;
    const s4 = fromCol === "srm04Count" ? newFromCount : toCol === "srm04Count" ? newToCount : machine.srm04Count;
    const s5 = fromCol === "srm05Count" ? newFromCount : toCol === "srm05Count" ? newToCount : machine.srm05Count;
    const s6 = fromCol === "srm06Count" ? newFromCount : toCol === "srm06Count" ? newToCount : machine.srm06Count;
    const sp = fromCol === "spareCount" ? newFromCount : toCol === "spareCount" ? newToCount : machine.spareCount;
    const srv = fromCol === "serviceCount" ? newFromCount : toCol === "serviceCount" ? newToCount : machine.serviceCount;
    const scr = fromCol === "scrapCount" ? newFromCount : toCol === "scrapCount" ? newToCount : machine.scrapCount;

    updatedData.totalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp + srv + scr;
    updatedData.srFinalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp;

    const updatedMachine = await prisma.machineAsset.update({
      where: { id: machine.id },
      data: updatedData,
    });

    // Record movement audit
    await prisma.machineMovement.create({
      data: {
        machineId: machine.id,
        fromLocation: fromGroup,
        toLocation: toGroup,
        purpose: purpose || `Transferred ${transferQty} unit(s) from ${fromGroup} to ${toGroup}`,
        issuedById: defaultUser.id,
        approvedById: defaultUser.id,
        repairCost: repairAmount.greaterThan(0) ? repairAmount.toFixed(2) : null,
        status: "RECEIVED",
        notes: notes || null,
      },
    });

    // If transferred to SERVICE or SCRAP, record service repair log
    if (toGroup === "SERVICE" || toGroup === "SCRAP") {
      await prisma.machineServiceRepair.create({
        data: {
          machineId: machine.id,
          vendorName: serviceVendor || (toGroup === "SCRAP" ? "Scrap Yard" : "Authorized Workshop"),
          faultDescription: faultDescription || purpose || (toGroup === "SCRAP" ? "Condemned & Scrapped" : "Routine Servicing"),
          repairCost: repairAmount.greaterThan(0) ? repairAmount.toFixed(2) : "0.00",
          status: toGroup === "SCRAP" ? "SCRAPPED" : "IN_SERVICE",
          journalEntryId,
          notes,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Transferred ${transferQty} x ${machine.name} from ${fromGroup} to ${toGroup} successfully.`,
      machine: updatedMachine,
      journalEntryId,
    });
  } catch (error: any) {
    console.error("POST /api/machines/transfer error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
