import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal } from "@/lib/decimal";
import { MachineStatus, MachineGroup, VoucherType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      machineId,
      toLocation,
      allocationGroup, // SRM01 - SRM06, OFFICE, SPARE, SERVICE, SCRAP
      purpose,
      repairCost = 0,
      notes,
    } = body;

    if (!machineId || !toLocation || !purpose) {
      return NextResponse.json(
        { success: false, error: "Machine, Destination Location and Purpose are required." },
        { status: 400 }
      );
    }

    const machine = await prisma.machineAsset.findUniqueOrThrow({ where: { id: machineId } });
    const defaultUser = await prisma.user.findFirstOrThrow();
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    const fromLocation = machine.currentLocation;

    // Determine new status
    let newStatus: MachineStatus = MachineStatus.ALLOCATED;
    if (allocationGroup === "OFFICE") newStatus = MachineStatus.AVAILABLE;
    else if (allocationGroup === "SERVICE") newStatus = MachineStatus.IN_SERVICE;
    else if (allocationGroup === "SPARE") newStatus = MachineStatus.SPARE;
    else if (allocationGroup === "SCRAP") newStatus = MachineStatus.SCRAP;

    // Handle repair expense if any
    const repairAmount = toDecimal(repairCost);
    let journalEntryId: string | null = null;

    if (repairAmount.greaterThan(0)) {
      const consumablesAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5060" } }); // Site Consumables & Repairs
      const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } }); // Cash in Hand

      const voucherInfo = await getNextVoucherNumber(fy.id, "CASH_PAYMENT");
      const journalEntry = await postDoubleEntryTransaction({
        voucherType: VoucherType.PAYMENT,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Machine Repair / Service Expense for ${machine.name} (${machine.assetCode})`,
        createdById: defaultUser.id,
        lines: [
          {
            accountId: consumablesAccount.id,
            debit: repairAmount,
            credit: 0,
            narration: `Repair cost for ${machine.name}`,
          },
          {
            accountId: cashAccount.id,
            debit: 0,
            credit: repairAmount,
            narration: `Cash payout for repair of ${machine.assetCode}`,
          },
        ],
      });
      journalEntryId = journalEntry.id;
    }

    // Record movement
    const movement = await prisma.machineMovement.create({
      data: {
        machineId: machine.id,
        fromLocation,
        toLocation,
        movementDate: new Date(),
        purpose,
        issuedById: defaultUser.id,
        approvedById: defaultUser.id,
        repairCost: repairAmount.greaterThan(0) ? repairAmount.toFixed(2) : null,
        status: "RECEIVED",
        notes: notes || null,
      },
    });

    // Update active allocation
    await prisma.machineAllocation.updateMany({
      where: { machineId: machine.id, status: "ACTIVE" },
      data: { status: "RELEASED", releaseDate: new Date() },
    });

    await prisma.machineAllocation.create({
      data: {
        machineId: machine.id,
        allocationGroup: (allocationGroup as MachineGroup) || MachineGroup.OFFICE,
        status: "ACTIVE",
        notes: `Transfer to ${toLocation}: ${purpose}`,
      },
    });

    // Update Machine asset record
    const updatedMachine = await prisma.machineAsset.update({
      where: { id: machine.id },
      data: {
        currentLocation: toLocation,
        currentStatus: newStatus,
      },
    });

    return NextResponse.json({ success: true, movement, machine: updatedMachine });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
