import { prisma } from "./prisma";
import { Decimal, toDecimal, isAmountEqual } from "./decimal";
import { Prisma, VoucherType, JournalStatus, AccountType } from "@prisma/client";

export interface JournalLineInput {
  accountId: string;
  debit: Decimal | number | string;
  credit: Decimal | number | string;
  narration?: string;
  projectId?: string;
  customerId?: string;
  supplierId?: string;
  contractorId?: string;
}

export interface PostTransactionInput {
  voucherType: VoucherType;
  financialYearId: string;
  entryNumber?: string;
  date: Date;
  narration: string;
  referenceNumber?: string;
  createdById: string;
  lines: JournalLineInput[];
}

/**
 * Generates and increments the next voucher number sequentially & atomically.
 * Accepts an optional transaction client so callers can keep voucher allocation
 * inside the same atomic database transaction as document & journal creation.
 */
export async function getNextVoucherNumber(
  financialYearId: string,
  voucherType: string,
  txClient?: Prisma.TransactionClient
): Promise<{ voucherNumber: string; sequenceNumber: number }> {
  const run = async (tx: Prisma.TransactionClient) => {
    const fy = await tx.financialYear.findUnique({ where: { id: financialYearId } });
    const shortFy = fy?.name?.slice(2) || "26-27";
    const fallbackPrefix = `${voucherType.substring(0, 2)}/${shortFy}/`;

    // Upsert ensures sequence exists, then atomic increment: 1 prevents concurrent duplicates
    await tx.voucherSequence.upsert({
      where: {
        financialYearId_voucherType: {
          financialYearId,
          voucherType,
        },
      },
      update: {},
      create: {
        financialYearId,
        voucherType,
        prefix: fallbackPrefix,
        nextNumber: 1,
        paddingLength: 4,
      },
    });

    const updated = await tx.voucherSequence.update({
      where: {
        financialYearId_voucherType: {
          financialYearId,
          voucherType,
        },
      },
      data: {
        nextNumber: { increment: 1 },
      },
    });

    const allocatedNum = updated.nextNumber - 1;
    const padded = String(allocatedNum).padStart(updated.paddingLength, "0");
    const voucherNumber = `${updated.prefix}${padded}`;

    return { voucherNumber, sequenceNumber: allocatedNum };
  };

  if (txClient) {
    return await run(txClient);
  }
  return await prisma.$transaction(run);
}

/**
 * Enforces strict Double-Entry Bookkeeping:
 * - SUM(debit) MUST equal SUM(credit)
 * - Updates chart of account balances accurately
 * - Records audit log
 */
export async function postDoubleEntryTransaction(
  input: PostTransactionInput,
  txClient?: Prisma.TransactionClient
) {
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  const cleanLines = input.lines.map((line) => {
    const d = toDecimal(line.debit);
    const c = toDecimal(line.credit);
    totalDebit = totalDebit.plus(d);
    totalCredit = totalCredit.plus(c);
    return {
      ...line,
      debit: d,
      credit: c,
    };
  });

  if (!isAmountEqual(totalDebit, totalCredit)) {
    throw new Error(
      `Double-Entry Bookkeeping Error: Out of balance! Total Debit (₹ ${totalDebit.toFixed(
        2
      )}) must strictly equal Total Credit (₹ ${totalCredit.toFixed(2)}). Difference: ₹ ${totalDebit
        .minus(totalCredit)
        .toFixed(2)}`
    );
  }

  if (totalDebit.isZero()) {
    throw new Error("Double-Entry Bookkeeping Error: Transaction amount cannot be zero.");
  }

  const execute = async (tx: Prisma.TransactionClient) => {
    // Check if Financial Year is locked or closed inside transaction
    const fy = await tx.financialYear.findUnique({
      where: { id: input.financialYearId },
    });
    if (fy?.isLocked || fy?.isClosed) {
      throw new Error(
        `Financial Year ${fy?.name || input.financialYearId} is locked or closed. Transactions cannot be posted to a locked period.`
      );
    }

    // 1. Resolve Entry Number if not provided
    let entryNum = input.entryNumber;
    if (!entryNum) {
      const generated = await getNextVoucherNumber(input.financialYearId, input.voucherType, tx);
      entryNum = generated.voucherNumber;
    }

    // 2. Create the Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: entryNum,
        date: input.date,
        voucherType: input.voucherType,
        referenceNumber: input.referenceNumber,
        narration: input.narration,
        financialYearId: input.financialYearId,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        status: JournalStatus.POSTED,
        createdById: input.createdById,
        lines: {
          create: cleanLines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit.toFixed(2),
            credit: l.credit.toFixed(2),
            narration: l.narration,
            projectId: l.projectId,
            customerId: l.customerId,
            supplierId: l.supplierId,
            contractorId: l.contractorId,
          })),
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

    // 3. Update Chart of Accounts balances atomically
    for (const line of cleanLines) {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: line.accountId },
      });

      const currentBal = toDecimal(account.currentBalance);
      let newBal = currentBal;

      if (
        account.type === AccountType.ASSET ||
        account.type === AccountType.EXPENSE
      ) {
        newBal = currentBal.plus(line.debit).minus(line.credit);
      } else {
        newBal = currentBal.plus(line.credit).minus(line.debit);
      }

      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: newBal.toFixed(2) },
      });
    }

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        action: "POST",
        entityType: "JournalEntry",
        entityId: journalEntry.id,
        newValues: JSON.stringify({
          entryNumber: journalEntry.entryNumber,
          totalAmount: totalDebit.toFixed(2),
          linesCount: cleanLines.length,
          narration: input.narration,
        }),
        performedById: input.createdById,
      },
    });

    return journalEntry;
  };

  if (txClient) {
    return await execute(txClient);
  }
  return await prisma.$transaction(execute);
}

/**
 * Reverses an authorized posted transaction. Never deletes records.
 */
export async function reverseJournalEntry(
  journalEntryId: string,
  userId: string,
  reason: string
) {
  return await prisma.$transaction(async (tx) => {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: journalEntryId },
      include: { lines: true, financialYear: true },
    });

    if (original.financialYear?.isLocked || original.financialYear?.isClosed) {
      throw new Error(
        `Financial Year ${original.financialYear?.name} is locked or closed. Reversals cannot be posted to a locked period.`
      );
    }

    if (original.status === JournalStatus.REVERSED) {
      throw new Error(`Transaction ${original.entryNumber} is already reversed.`);
    }

    if (original.isReversal) {
      throw new Error("Cannot reverse a reversal transaction.");
    }

    // Generate reversal number
    const revSeq = await getNextVoucherNumber(original.financialYearId, "JOURNAL_VOUCHER");
    const reversalNumber = `REV-${original.entryNumber}`;

    // Swap debits and credits for exact reversal
    const reversalLines = original.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      narration: `Reversal of ${original.entryNumber}: ${line.narration || ""}`,
      projectId: line.projectId,
      customerId: line.customerId,
      supplierId: line.supplierId,
      contractorId: line.contractorId,
    }));

    // Create the Reversal Journal Entry
    const reversalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: reversalNumber,
        date: new Date(),
        voucherType: VoucherType.REVERSAL,
        referenceNumber: original.entryNumber,
        narration: `REVERSAL of ${original.entryNumber}. Reason: ${reason}`,
        financialYearId: original.financialYearId,
        totalDebit: original.totalCredit,
        totalCredit: original.totalDebit,
        status: JournalStatus.POSTED,
        isReversal: true,
        reversalOfId: original.id,
        reversalReason: reason,
        createdById: userId,
        lines: {
          create: reversalLines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            narration: l.narration,
            projectId: l.projectId,
            customerId: l.customerId,
            supplierId: l.supplierId,
            contractorId: l.contractorId,
          })),
        },
      },
    });

    // Mark original as REVERSED
    await tx.journalEntry.update({
      where: { id: original.id },
      data: {
        status: JournalStatus.REVERSED,
        reversalReason: reason,
      },
    });

    // Reverse account balances
    for (const line of reversalLines) {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: line.accountId },
      });

      const currentBal = toDecimal(account.currentBalance);
      let newBal = currentBal;

      if (
        account.type === AccountType.ASSET ||
        account.type === AccountType.EXPENSE
      ) {
        newBal = currentBal.plus(toDecimal(line.debit)).minus(toDecimal(line.credit));
      } else {
        newBal = currentBal.plus(toDecimal(line.credit)).minus(toDecimal(line.debit));
      }

      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: newBal.toFixed(2) },
      });
    }

    // Audit Log
    await tx.auditLog.create({
      data: {
        action: "REVERSAL",
        entityType: "JournalEntry",
        entityId: original.id,
        newValues: JSON.stringify({
          reversalEntryId: reversalEntry.id,
          reversalNumber,
          reason,
        }),
        performedById: userId,
      },
    });

    return reversalEntry;
  });
}
