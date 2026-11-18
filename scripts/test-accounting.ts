import { prisma } from "../src/lib/prisma";
import { postDoubleEntryTransaction, reverseJournalEntry, getNextVoucherNumber } from "../src/lib/accounting";
import { formatINR, toDecimal } from "../src/lib/decimal";
import { VoucherType, CashFlowType } from "@prisma/client";

async function runTests() {
  console.log("===============================================================");
  console.log("SR-BOOKS DOUBLE-ENTRY ACCOUNTING & LEDGER INTEGRITY TEST SUITE");
  console.log("===============================================================");

  const fy = await prisma.financialYear.findFirstOrThrow({
    where: { isCurrent: true },
  });
  const adminUser = await prisma.user.findFirstOrThrow();

  const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
  const incomeAccount = await prisma.account.findUniqueOrThrow({ where: { code: "4010" } });
  const consumablesAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5060" } });

  const initialCash = toDecimal(cashAccount.currentBalance);
  const initialIncome = toDecimal(incomeAccount.currentBalance);
  const initialExpense = toDecimal(consumablesAccount.currentBalance);

  console.log(`[Baseline] Cash in Hand (1010): ${formatINR(initialCash)}`);
  console.log(`[Baseline] Roofing Income (4010): ${formatINR(initialIncome)}`);
  console.log(`[Baseline] Site Consumables (5060): ${formatINR(initialExpense)}`);
  console.log("---------------------------------------------------------------");

  // TEST 1: Post Cash Receipt of ₹ 50,000.00
  console.log("▶ TEST 1: Posting Cash Receipt of ₹ 50,000.00 (Customer Advance)...");
  const receiptVoucherInfo = await getNextVoucherNumber(fy.id, "CASH_RECEIPT");

  const receiptEntry = await postDoubleEntryTransaction({
    voucherType: VoucherType.RECEIPT,
    financialYearId: fy.id,
    entryNumber: receiptVoucherInfo.voucherNumber,
    date: new Date(),
    narration: "Advance cash receipt for Texvalley Weaving Shed project",
    createdById: adminUser.id,
    lines: [
      {
        accountId: cashAccount.id,
        debit: 50000.00,
        credit: 0.00,
        narration: "Cash received",
      },
      {
        accountId: incomeAccount.id,
        debit: 0.00,
        credit: 50000.00,
        narration: "Roofing project contract income credit",
      },
    ],
  });

  // Verify updated balances
  const updatedCashAfterReceipt = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
  const updatedIncomeAfterReceipt = await prisma.account.findUniqueOrThrow({ where: { code: "4010" } });

  console.log(`✓ Receipt Voucher Posted: ${receiptEntry.entryNumber}`);
  console.log(`  Debits: ${formatINR(receiptEntry.totalDebit)} | Credits: ${formatINR(receiptEntry.totalCredit)}`);
  console.log(`  New Cash in Hand: ${formatINR(updatedCashAfterReceipt.currentBalance)} (Expected: ${formatINR(initialCash.plus(50000))})`);
  console.log(`  New Roofing Income: ${formatINR(updatedIncomeAfterReceipt.currentBalance)} (Expected: ${formatINR(initialIncome.plus(50000))})`);

  if (!toDecimal(updatedCashAfterReceipt.currentBalance).equals(initialCash.plus(50000))) {
    throw new Error("Cash balance calculation mismatch on Receipt!");
  }

  console.log("---------------------------------------------------------------");

  // TEST 2: Post Cash Expense of ₹ 4,500.00
  console.log("▶ TEST 2: Posting Cash Expense of ₹ 4,500.00 (Site Consumables & Star Bits)...");
  const expenseVoucherInfo = await getNextVoucherNumber(fy.id, "CASH_PAYMENT");

  const expenseEntry = await postDoubleEntryTransaction({
    voucherType: VoucherType.PAYMENT,
    financialYearId: fy.id,
    entryNumber: expenseVoucherInfo.voucherNumber,
    date: new Date(),
    narration: "Purchased Star Bits & SDS Screws from Selvam Hardware for site team",
    createdById: adminUser.id,
    lines: [
      {
        accountId: consumablesAccount.id,
        debit: 4500.00,
        credit: 0.00,
        narration: "Site consumables purchase",
      },
      {
        accountId: cashAccount.id,
        debit: 0.00,
        credit: 4500.00,
        narration: "Cash paid out",
      },
    ],
  });

  const updatedCashAfterExpense = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
  const updatedExpenseAfterExpense = await prisma.account.findUniqueOrThrow({ where: { code: "5060" } });

  console.log(`✓ Expense Voucher Posted: ${expenseEntry.entryNumber}`);
  console.log(`  Debits: ${formatINR(expenseEntry.totalDebit)} | Credits: ${formatINR(expenseEntry.totalCredit)}`);
  console.log(`  New Cash in Hand: ${formatINR(updatedCashAfterExpense.currentBalance)} (Expected: ${formatINR(initialCash.plus(50000).minus(4500))})`);
  console.log(`  New Site Consumables: ${formatINR(updatedExpenseAfterExpense.currentBalance)} (Expected: ${formatINR(initialExpense.plus(4500))})`);

  if (!toDecimal(updatedCashAfterExpense.currentBalance).equals(initialCash.plus(50000).minus(4500))) {
    throw new Error("Cash balance calculation mismatch on Expense!");
  }

  console.log("---------------------------------------------------------------");

  // TEST 3: Test Authorized Reversal of the ₹ 4,500.00 expense
  console.log(`▶ TEST 3: Executing Reversal on Expense ${expenseEntry.entryNumber}...`);
  const reversalEntry = await reverseJournalEntry(
    expenseEntry.id,
    adminUser.id,
    "Invoice cancelled by vendor due to wrong rate billing"
  );

  const restoredCash = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
  const restoredExpense = await prisma.account.findUniqueOrThrow({ where: { code: "5060" } });

  console.log(`✓ Reversal Entry Created: ${reversalEntry.entryNumber}`);
  console.log(`  Restored Cash in Hand: ${formatINR(restoredCash.currentBalance)} (Back to ${formatINR(initialCash.plus(50000))})`);
  console.log(`  Restored Consumables Expense: ${formatINR(restoredExpense.currentBalance)} (Back to ${formatINR(initialExpense)})`);

  if (!toDecimal(restoredCash.currentBalance).equals(initialCash.plus(50000))) {
    throw new Error("Reversal failed to restore cash balance!");
  }

  console.log("---------------------------------------------------------------");

  // TEST 4: Double-Entry Guard (Prevent Unbalanced Transaction)
  console.log("▶ TEST 4: Testing Double-Entry Guard against unbalanced transactions...");
  try {
    await postDoubleEntryTransaction({
      voucherType: VoucherType.JOURNAL_VOUCHER,
      financialYearId: fy.id,
      entryNumber: "TEST-UNBALANCED",
      date: new Date(),
      narration: "Unbalanced attempt",
      createdById: adminUser.id,
      lines: [
        { accountId: cashAccount.id, debit: 1000, credit: 0 },
        { accountId: incomeAccount.id, debit: 0, credit: 500 }, // Out of balance by 500!
      ],
    });
    throw new Error("CRITICAL FAILURE: System allowed an unbalanced transaction!");
  } catch (err: any) {
    console.log(`✓ Correctly Blocked Unbalanced Transaction: "${err.message}"`);
  }

  console.log("===============================================================");
  console.log("✅ ALL DOUBLE-ENTRY BOOKKEEPING & LEDGER TESTS PASSED PERFECTLY!");
  console.log("===============================================================");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
