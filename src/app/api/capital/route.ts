import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { postDoubleEntryTransaction } from "@/lib/accounting";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const [capitalTransactions, loans, emiPayments, fixedAssets, bankAccounts] = await Promise.all([
      prisma.capitalTransaction.findMany({
        include: {
          bankAccount: true,
          journalEntry: { select: { id: true, entryNumber: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.businessLoan.findMany({
        include: {
          bankAccount: true,
          emiPayments: { orderBy: { paymentDate: "desc" } },
          journalEntry: { select: { id: true, entryNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.loanEmiPayment.findMany({
        include: {
          loan: true,
          bankAccount: true,
          journalEntry: { select: { id: true, entryNumber: true } },
        },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.fixedAsset.findMany({
        include: {
          supplier: true,
          journalEntry: { select: { id: true, entryNumber: true } },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.bankAccount.findMany({ where: { active: true } }),
    ]);

    // Financial summaries
    let totalCapitalInfused = toDecimal(0);
    let totalDrawings = toDecimal(0);
    capitalTransactions.forEach((t) => {
      if (t.transactionType === "CAPITAL_INFUSION") {
        totalCapitalInfused = totalCapitalInfused.plus(toDecimal(t.amount));
      } else {
        totalDrawings = totalDrawings.plus(toDecimal(t.amount));
      }
    });

    let totalLoanOutstanding = toDecimal(0);
    loans.forEach((l) => {
      if (l.status === "ACTIVE") {
        totalLoanOutstanding = totalLoanOutstanding.plus(toDecimal(l.outstandingBalance));
      }
    });

    let totalFixedAssetsValue = toDecimal(0);
    fixedAssets.forEach((fa) => {
      totalFixedAssetsValue = totalFixedAssetsValue.plus(toDecimal(fa.currentBookValue));
    });

    return NextResponse.json({
      success: true,
      capitalTransactions,
      loans,
      emiPayments,
      fixedAssets,
      bankAccounts,
      summary: {
        totalCapitalInfused: totalCapitalInfused.toNumber(),
        totalDrawings: totalDrawings.toNumber(),
        netEquityInjected: totalCapitalInfused.minus(totalDrawings).toNumber(),
        totalLoanOutstanding: totalLoanOutstanding.toNumber(),
        totalFixedAssetsValue: totalFixedAssetsValue.toNumber(),
      },
    });
  } catch (error: any) {
    console.error("GET /api/capital error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const fy = (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
      (await prisma.financialYear.findFirst());
    if (!fy) throw new Error("No active financial year found");

    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No user found");

    // -------------------------------------------------------------
    // 1. CAPITAL INFUSION / PARTNER DRAWING
    // -------------------------------------------------------------
    if (action === "CAPITAL_TRANSACTION") {
      const { partnerName, transactionType, amount, paymentMode, bankAccountId, notes, date } = body;
      const amt = toDecimal(amount);
      if (amt.lessThanOrEqualTo(0)) throw new Error("Amount must be greater than zero");

      const count = await prisma.capitalTransaction.count();
      const voucherNumber = `CAP/26-27/${String(count + 1).padStart(4, "0")}`;

      // Resolve Liquidity Account (Bank or Cash)
      let liquidityAccountId: string;
      if (paymentMode === "BANK" && bankAccountId) {
        const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!bank) throw new Error("Bank account not found");
        liquidityAccountId = bank.accountId;
      } else {
        const cashAcc = await prisma.account.findFirst({ where: { code: "1010" } });
        if (!cashAcc) throw new Error("Cash in Hand account not found");
        liquidityAccountId = cashAcc.id;
      }

      // Resolve Equity Account (3010 for Infusion, 3030 for Drawings)
      const equityAccCode = transactionType === "CAPITAL_INFUSION" ? "3010" : "3030";
      let equityAccount = await prisma.account.findFirst({ where: { code: equityAccCode } });
      if (!equityAccount) {
        equityAccount = await prisma.account.findFirst({ where: { type: "EQUITY" } });
      }
      if (!equityAccount) throw new Error("Equity account not found");

      let lines: any[] = [];
      let narration = "";

      if (transactionType === "CAPITAL_INFUSION") {
        // Dr Bank/Cash, Cr Partner Capital (3010)
        narration = `Capital Infusion by ${partnerName} into Standard Roofs via ${paymentMode} [${voucherNumber}]`;
        lines = [
          { accountId: liquidityAccountId, debit: amt, credit: toDecimal(0), narration },
          { accountId: equityAccount.id, debit: toDecimal(0), credit: amt, narration: `Owner Capital Contribution - ${partnerName}` },
        ];
      } else {
        // Dr Partner Drawings (3030), Cr Bank/Cash
        narration = `Partner Drawings taken by ${partnerName} via ${paymentMode} [${voucherNumber}]`;
        lines = [
          { accountId: equityAccount.id, debit: amt, credit: toDecimal(0), narration: `Owner Drawings - ${partnerName}` },
          { accountId: liquidityAccountId, debit: toDecimal(0), credit: amt, narration },
        ];
      }

      const jEntry = await postDoubleEntryTransaction({
        date: date ? new Date(date) : new Date(),
        voucherType: "CAPITAL_TRANSACTION",
        narration,
        financialYearId: fy.id,
        lines,
        createdById: adminUser.id,
        referenceNumber: voucherNumber,
      });

      const txRecord = await prisma.capitalTransaction.create({
        data: {
          voucherNumber,
          partnerName,
          transactionType,
          amount: new Decimal(amt.toString()),
          date: date ? new Date(date) : new Date(),
          paymentMode: paymentMode || "BANK",
          bankAccountId: bankAccountId || null,
          notes,
          journalEntryId: jEntry.id,
        },
      });

      return NextResponse.json({ success: true, transaction: txRecord });
    }

    // -------------------------------------------------------------
    // 2. REGISTER BUSINESS LOAN
    // -------------------------------------------------------------
    if (action === "ADD_LOAN") {
      const {
        loanCode,
        lenderName,
        loanType,
        accountNumber,
        principalAmount,
        interestRate,
        tenureMonths,
        monthlyEmiAmount,
        emiDueDay,
        disbursementDate,
        bankAccountId,
        notes,
        recordDisbursementVoucher,
      } = body;

      const principal = toDecimal(principalAmount);
      const code = loanCode || `LN-${Date.now().toString().slice(-4)}`;

      let journalEntryId: string | null = null;

      // If user checks "Disburse Principal to Bank Account immediately"
      if (recordDisbursementVoucher && bankAccountId) {
        const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!bank) throw new Error("Selected bank account not found");

        let loanLiabilityAcc = await prisma.account.findFirst({ where: { code: "2060" } });
        if (!loanLiabilityAcc) {
          loanLiabilityAcc = await prisma.account.findFirst({ where: { type: "LIABILITY" } });
        }
        if (!loanLiabilityAcc) throw new Error("Loan liability account not found");

        const narration = `Loan Disbursement from ${lenderName} (${code}) into ${bank.accountName}`;
        const lines = [
          { accountId: bank.accountId, debit: principal, credit: toDecimal(0), narration },
          { accountId: loanLiabilityAcc.id, debit: toDecimal(0), credit: principal, narration: `Loan Principal Liability - ${lenderName}` },
        ];

        const jEntry = await postDoubleEntryTransaction({
          date: disbursementDate ? new Date(disbursementDate) : new Date(),
          voucherType: "LOAN_DISBURSEMENT",
          narration,
          financialYearId: fy.id,
          lines,
          createdById: adminUser.id,
          referenceNumber: code,
        });
        journalEntryId = jEntry.id;
      }

      const loan = await prisma.businessLoan.create({
        data: {
          loanCode: code,
          lenderName,
          loanType: loanType || "VEHICLE_LOAN",
          accountNumber,
          principalAmount: new Decimal(principal.toString()),
          outstandingBalance: new Decimal(principal.toString()),
          interestRate: new Decimal(interestRate || 10.5),
          tenureMonths: parseInt(tenureMonths) || 36,
          monthlyEmiAmount: new Decimal(monthlyEmiAmount || 0),
          emiDueDay: parseInt(emiDueDay) || 5,
          disbursementDate: disbursementDate ? new Date(disbursementDate) : new Date(),
          bankAccountId: bankAccountId || null,
          notes,
          journalEntryId,
        },
      });

      return NextResponse.json({ success: true, loan });
    }

    // -------------------------------------------------------------
    // 3. RECORD MONTHLY LOAN EMI PAYMENT (3-LINE BALANCED SPLIT)
    // -------------------------------------------------------------
    if (action === "PAY_EMI") {
      const { loanId, paymentDate, emiMonth, principalComponent, interestComponent, bankAccountId, notes } = body;

      const loan = await prisma.businessLoan.findUnique({ where: { id: loanId } });
      if (!loan) throw new Error("Loan not found");

      const pComp = toDecimal(principalComponent);
      const iComp = toDecimal(interestComponent);
      const totalEmi = pComp.plus(iComp);

      if (totalEmi.lessThanOrEqualTo(0)) throw new Error("EMI total must be greater than zero");

      const count = await prisma.loanEmiPayment.count();
      const receiptNumber = `EMI/26-27/${String(count + 1).padStart(4, "0")}`;

      // Bank account
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) throw new Error("Paying bank account not found");

      // 1. Loan Principal Liability Account (2060)
      let loanLiabilityAcc = await prisma.account.findFirst({ where: { code: "2060" } });
      if (!loanLiabilityAcc) loanLiabilityAcc = await prisma.account.findFirst({ where: { type: "LIABILITY" } });
      if (!loanLiabilityAcc) throw new Error("Loan liability account not found");

      // 2. Loan Interest Expense Account (5100 or 5090)
      let interestExpenseAcc = await prisma.account.findFirst({
        where: { OR: [{ code: "5100" }, { code: "5090" }] },
      });
      if (!interestExpenseAcc) interestExpenseAcc = await prisma.account.findFirst({ where: { type: "EXPENSE" } });
      if (!interestExpenseAcc) throw new Error("Interest expense account not found");

      // Balanced 3-Line Double Entry:
      // Dr Loan Principal Liability
      // Dr Loan Interest Expense
      // Cr Bank Account
      const narration = `EMI Payout for ${loan.lenderName} (${loan.loanCode}) - Month: ${emiMonth || "Current"} [${receiptNumber}] Principal: ₹${pComp}, Interest: ₹${iComp}`;
      const lines = [
        {
          accountId: loanLiabilityAcc.id,
          debit: pComp,
          credit: toDecimal(0),
          narration: `Principal repayment for ${loan.loanCode}`,
        },
        {
          accountId: interestExpenseAcc.id,
          debit: iComp,
          credit: toDecimal(0),
          narration: `Interest component for ${loan.loanCode}`,
        },
        {
          accountId: bank.accountId,
          debit: toDecimal(0),
          credit: totalEmi,
          narration: `EMI Auto-Debit from ${bank.accountName}`,
        },
      ];

      const jEntry = await postDoubleEntryTransaction({
        date: paymentDate ? new Date(paymentDate) : new Date(),
        voucherType: "LOAN_EMI",
        narration,
        financialYearId: fy.id,
        lines,
        createdById: adminUser.id,
        referenceNumber: receiptNumber,
      });

      // Save EMI record and deduct from loan balance
      const emiRecord = await prisma.$transaction(async (tx) => {
        const rec = await tx.loanEmiPayment.create({
          data: {
            receiptNumber,
            loanId,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            emiMonth: emiMonth || "Current Month",
            principalComponent: new Decimal(pComp.toString()),
            interestComponent: new Decimal(iComp.toString()),
            totalEmiAmount: new Decimal(totalEmi.toString()),
            paymentMode: "BANK",
            bankAccountId,
            journalEntryId: jEntry.id,
            notes,
          },
        });

        const newOutstanding = toDecimal(loan.outstandingBalance).minus(pComp);
        await tx.businessLoan.update({
          where: { id: loanId },
          data: {
            outstandingBalance: new Decimal(Math.max(0, newOutstanding.toNumber()).toString()),
            status: newOutstanding.lessThanOrEqualTo(0) ? "CLOSED" : "ACTIVE",
          },
        });

        return rec;
      });

      return NextResponse.json({ success: true, emiPayment: emiRecord });
    }

    // -------------------------------------------------------------
    // 4. REGISTER FIXED ASSET
    // -------------------------------------------------------------
    if (action === "ADD_FIXED_ASSET") {
      const {
        assetCode,
        name,
        category,
        purchaseDate,
        purchaseCost,
        depreciationRateAnnual,
        supplierId,
        paymentMode,
        bankAccountId,
        notes,
      } = body;

      const cost = toDecimal(purchaseCost);
      const code = assetCode || `FA-${Date.now().toString().slice(-4)}`;

      // Resolve Asset Account (1520 for Vehicles, 1510 for Machinery & Equipment)
      const accCode = category === "VEHICLE" ? "1520" : "1510";
      let assetAcc = await prisma.account.findFirst({ where: { code: accCode } });
      if (!assetAcc) assetAcc = await prisma.account.findFirst({ where: { subType: "FIXED_ASSET" } });
      if (!assetAcc) throw new Error("Fixed asset ledger account not found");

      let creditAccountId: string;
      if (paymentMode === "BANK" && bankAccountId) {
        const b = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!b) throw new Error("Bank not found");
        creditAccountId = b.accountId;
      } else {
        const c = await prisma.account.findFirst({ where: { code: "1010" } });
        creditAccountId = c ? c.id : assetAcc.id;
      }

      const narration = `Fixed Asset Acquisition: ${name} (${code}) [${category}]`;
      const lines = [
        { accountId: assetAcc.id, debit: cost, credit: toDecimal(0), narration },
        { accountId: creditAccountId, debit: toDecimal(0), credit: cost, narration: `Paid via ${paymentMode || "BANK"}` },
      ];

      const jEntry = await postDoubleEntryTransaction({
        date: purchaseDate ? new Date(purchaseDate) : new Date(),
        voucherType: "FIXED_ASSET_ACQUISITION",
        narration,
        financialYearId: fy.id,
        lines,
        createdById: adminUser.id,
        referenceNumber: code,
      });

      const asset = await prisma.fixedAsset.create({
        data: {
          assetCode: code,
          name,
          category: category || "PEB_MACHINERY",
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          purchaseCost: new Decimal(cost.toString()),
          currentBookValue: new Decimal(cost.toString()),
          depreciationRateAnnual: new Decimal(depreciationRateAnnual || 15.0),
          supplierId: supplierId || null,
          journalEntryId: jEntry.id,
          notes,
        },
      });

      return NextResponse.json({ success: true, fixedAsset: asset });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/capital error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
