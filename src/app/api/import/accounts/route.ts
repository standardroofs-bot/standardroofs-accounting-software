import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { VoucherType } from "@prisma/client";

// Normalize header text for fuzzy matching
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Auto-detect column mapping from headers
function autoDetectColumns(headers: string[]) {
  const mapping: Record<string, string> = {
    date: "",
    site: "",
    customer: "",
    team: "",
    particulars: "",
    category: "",
    moneyIn: "",
    moneyOut: "",
    paymentMode: "",
    voucherNo: "",
  };

  headers.forEach((h) => {
    const nh = normalizeHeader(h);
    if (!mapping.date && (nh.includes("date") || nh === "dt" || nh.includes("transdate"))) {
      mapping.date = h;
    } else if (!mapping.site && (nh.includes("site") || nh.includes("project"))) {
      mapping.site = h;
    } else if (!mapping.customer && (nh.includes("customer") || nh.includes("client") || nh.includes("party"))) {
      mapping.customer = h;
    } else if (!mapping.team && (nh.includes("team") || nh.includes("srm") || nh.includes("gang"))) {
      mapping.team = h;
    } else if (!mapping.particulars && (nh.includes("particular") || nh.includes("desc") || nh.includes("purpose") || nh.includes("item") || nh.includes("detail") || nh.includes("narration"))) {
      mapping.particulars = h;
    } else if (!mapping.category && (nh.includes("category") || nh.includes("head") || nh.includes("exptype") || nh === "type")) {
      mapping.category = h;
    } else if (!mapping.moneyIn && (nh.includes("moneyin") || nh.includes("inflow") || nh.includes("received") || nh.includes("receipt") || nh.includes("credit") || nh === "in")) {
      mapping.moneyIn = h;
    } else if (!mapping.moneyOut && (nh.includes("moneyout") || nh.includes("outflow") || nh.includes("paid") || nh.includes("payment") || nh.includes("debit") || nh === "out" || nh.includes("expense") || nh === "amount")) {
      mapping.moneyOut = h;
    } else if (!mapping.paymentMode && (nh.includes("mode") || nh.includes("channel") || nh.includes("paidby") || nh.includes("cashbank"))) {
      mapping.paymentMode = h;
    } else if (!mapping.voucherNo && (nh.includes("voucher") || nh.includes("bill") || nh.includes("invoice") || nh.includes("refno") || nh.includes("reference"))) {
      mapping.voucherNo = h;
    }
  });

  return mapping;
}

// Clean date parser handling Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD
function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel date epoch offset
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const s = String(val).trim();
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const year = y < 100 ? 2000 + y : y;
      return new Date(year, m, d);
    }
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const action = (formData.get("action") as string) || "inspect"; // inspect | preview | commit
    const selectedSheet = (formData.get("sheetName") as string) || "";
    const rawColumnMap = formData.get("columnMap") as string | null;

    if (!file) throw new Error("No Accounts Excel workbook uploaded");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Uploaded Excel workbook has no readable sheets.");
    }

    // 1. ACTION === "inspect": Return sheets, column headers & suggested mapping
    if (action === "inspect") {
      const targetSheetName = selectedSheet && workbook.SheetNames.includes(selectedSheet)
        ? selectedSheet
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[targetSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headers: string[] = (rawRows[0] || []).map((h: any) => String(h || "").trim()).filter(Boolean);

      const objectRows: any[] = XLSX.utils.sheet_to_json(worksheet);
      const suggestedMapping = autoDetectColumns(headers);

      return NextResponse.json({
        success: true,
        action: "inspect",
        fileName: file.name,
        sheetNames: workbook.SheetNames,
        currentSheet: targetSheetName,
        headers,
        suggestedMapping,
        sampleRows: objectRows.slice(0, 5),
        totalRows: objectRows.length,
      });
    }

    // Determine mapping to use
    let colMap: Record<string, string> = {};
    if (rawColumnMap) {
      try {
        colMap = JSON.parse(rawColumnMap);
      } catch {
        colMap = {};
      }
    }

    // Gather sheets to process
    const sheetsToProcess = selectedSheet && selectedSheet !== "ALL" && workbook.SheetNames.includes(selectedSheet)
      ? [selectedSheet]
      : workbook.SheetNames;

    // Parse all rows across selected sheets
    let allRawRows: any[] = [];
    sheetsToProcess.forEach((sheetName: string) => {
      const ws = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      rows.forEach((r) => {
        allRawRows.push({ ...r, _originSheet: sheetName });
      });
    });

    if (allRawRows.length === 0) {
      throw new Error("No data rows found in the selected sheet(s).");
    }

    // Fallback auto detect if mapping is empty
    if (!colMap.particulars && !colMap.moneyOut && !colMap.moneyIn) {
      const firstHeaders = Object.keys(allRawRows[0] || {});
      colMap = autoDetectColumns(firstHeaders);
    }

    // Normalize and categorize each row
    const normalizedRows: any[] = [];
    const uniqueSites = new Set<string>();
    let totalInflow = toDecimal(0);
    let totalOutflow = toDecimal(0);
    let siteExpenseTotal = toDecimal(0);
    let officeExpenseTotal = toDecimal(0);

    allRawRows.forEach((row, idx) => {
      const dateVal = colMap.date ? row[colMap.date] : row["Date"] || row["Date *"];
      const date = parseExcelDate(dateVal);

      const siteName = String(
        (colMap.site ? row[colMap.site] : row["Site / Project Name *"] || row["Site Name *"] || row["Site"] || "") || ""
      ).trim();

      const customerName = String(
        (colMap.customer ? row[colMap.customer] : row["Customer Name"] || row["Customer"] || "") || ""
      ).trim();

      const teamName = String(
        (colMap.team ? row[colMap.team] : row["Team Name"] || row["Team"] || "") || ""
      ).trim();

      const particulars = String(
        (colMap.particulars ? row[colMap.particulars] : row["Particulars / Description *"] || row["Particulars"] || row["Description"] || `Row ${idx + 1}`) || ""
      ).trim();

      const categoryRaw = String(
        (colMap.category ? row[colMap.category] : row["Category"] || row["Type"] || "") || ""
      ).trim().toLowerCase();

      const moneyInNum = parseFloat(
        (colMap.moneyIn ? row[colMap.moneyIn] : row["Money In (₹)"] || row["Money In"] || row["Inflow"] || 0) || 0
      ) || 0;

      const moneyOutNum = parseFloat(
        (colMap.moneyOut ? row[colMap.moneyOut] : row["Money Out (₹)"] || row["Money Out"] || row["Outflow"] || row["Amount (₹)"] || row["Amount"] || 0) || 0
      ) || 0;

      const paymentMode = String(
        (colMap.paymentMode ? row[colMap.paymentMode] : row["Payment Mode (Cash / Bank / UPI)"] || row["Payment Mode"] || row["Mode"] || "Cash") || "Cash"
      ).trim();

      const voucherNo = String(
        (colMap.voucherNo ? row[colMap.voucherNo] : row["Bill / Voucher / Ref No"] || row["Voucher No"] || "") || ""
      ).trim();

      if (moneyInNum <= 0 && moneyOutNum <= 0) return; // Skip zero balance rows

      // Classification
      let txnType: "CUSTOMER_PAYMENT" | "DIRECT_SITE_EXPENSE" | "LABOUR_CONTRACTOR" | "OFFICE_OVERHEAD" = "DIRECT_SITE_EXPENSE";
      let isOffice = false;

      if (moneyInNum > 0) {
        txnType = "CUSTOMER_PAYMENT";
      } else if (
        categoryRaw.includes("office") ||
        categoryRaw.includes("rent") ||
        categoryRaw.includes("eb") ||
        categoryRaw.includes("electricity") ||
        siteName.toLowerCase().includes("office") ||
        teamName.toLowerCase() === "office"
      ) {
        txnType = "OFFICE_OVERHEAD";
        isOffice = true;
      } else if (categoryRaw.includes("labour") || categoryRaw.includes("contractor") || categoryRaw.includes("wage") || categoryRaw.includes("muster")) {
        txnType = "LABOUR_CONTRACTOR";
      } else {
        txnType = "DIRECT_SITE_EXPENSE";
      }

      if (siteName && !isOffice) {
        uniqueSites.add(siteName);
      }

      const inDec = toDecimal(moneyInNum);
      const outDec = toDecimal(moneyOutNum);
      totalInflow = totalInflow.plus(inDec);
      totalOutflow = totalOutflow.plus(outDec);

      if (isOffice) {
        officeExpenseTotal = officeExpenseTotal.plus(outDec);
      } else if (moneyOutNum > 0) {
        siteExpenseTotal = siteExpenseTotal.plus(outDec);
      }

      normalizedRows.push({
        rowIndex: idx + 1,
        date: date.toISOString().split("T")[0],
        dateObj: date,
        siteName: isOffice ? "Erode Head Office / Admin" : siteName || "General Roofing Project",
        customerName,
        teamName: teamName || (isOffice ? "Office" : "SRM01"),
        particulars,
        category: categoryRaw || (isOffice ? "Office Overhead" : txnType === "CUSTOMER_PAYMENT" ? "Customer Payment" : "Site Direct"),
        moneyIn: inDec.toFixed(2),
        moneyOut: outDec.toFixed(2),
        paymentMode: paymentMode.toUpperCase().includes("BANK") || paymentMode.toUpperCase().includes("NEFT") || paymentMode.toUpperCase().includes("RTGS") ? "BANK" : "CASH",
        voucherNo,
        txnType,
        isOffice,
        originSheet: row._originSheet,
      });
    });

    const summary = {
      totalRows: normalizedRows.length,
      sitesCount: uniqueSites.size,
      uniqueSites: Array.from(uniqueSites),
      totalInflow: totalInflow.toFixed(2),
      totalOutflow: totalOutflow.toFixed(2),
      siteExpenseTotal: siteExpenseTotal.toFixed(2),
      officeExpenseTotal: officeExpenseTotal.toFixed(2),
      netBatchCashflow: totalInflow.minus(totalOutflow).toFixed(2),
    };

    // 2. ACTION === "preview": Return live summary card and parsed preview rows
    if (action === "preview") {
      return NextResponse.json({
        success: true,
        action: "preview",
        summary,
        previewRows: normalizedRows.slice(0, 100),
      });
    }

    // 3. ACTION === "commit": Commit entire batch with double entry and auto master creation
    if (action === "commit") {
      const defaultUser = await prisma.user.findFirstOrThrow();
      const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

      // Core GL Accounts
      const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
      const bankAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1020" } });
      const revenueAccount = await prisma.account.findUniqueOrThrow({ where: { code: "4010" } });
      const directMaterialAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5010" } });
      const transportAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5020" } });
      const labourAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5030" } });
      const contractorAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5040" } });
      const siteFoodAccount = await prisma.account.findUniqueOrThrow({ where: { code: "6080" } });
      const officeRentAccount = await prisma.account.findUniqueOrThrow({ where: { code: "6020" } });
      const officeSalariesAccount = await prisma.account.findUniqueOrThrow({ where: { code: "6010" } });
      const generalOfficeExpenseAccount = await prisma.account.findUniqueOrThrow({ where: { code: "6040" } });

      // Generate Batch ID
      const batchCount = await prisma.importBatch.count();
      const batchNumber = `BATCH-2026-${String(batchCount + 1).padStart(4, "0")}`;

      const importBatch = await prisma.importBatch.create({
        data: {
          batchNumber,
          fileName: file.name,
          fileType: "ACCOUNTS_EXCEL",
          totalRows: normalizedRows.length,
          totalInflow: totalInflow.toFixed(2),
          totalOutflow: totalOutflow.toFixed(2),
          sitesCount: uniqueSites.size,
          status: "COMMITTED",
          createdById: defaultUser.id,
          notes: `Imported ${normalizedRows.length} transactions across ${uniqueSites.size} project sites on ${new Date().toLocaleDateString("en-IN")}.`,
        },
      });

      // Master lookup caches to prevent duplicates
      const customerCache: Record<string, string> = {};
      const projectCache: Record<string, string> = {};

      // Seed cache with existing
      const existingCustomers = await prisma.customer.findMany({ select: { id: true, name: true } });
      existingCustomers.forEach((c) => {
        customerCache[c.name.trim().toLowerCase()] = c.id;
      });

      const existingProjects = await prisma.project.findMany({ select: { id: true, name: true } });
      existingProjects.forEach((p) => {
        projectCache[p.name.trim().toLowerCase()] = p.id;
      });

      let committedCount = 0;

      for (const row of normalizedRows) {
        let projectId: string | null = null;
        let customerId: string | null = null;

        // Auto-create Customer if not existing
        if (row.customerName) {
          const custKey = row.customerName.trim().toLowerCase();
          if (customerCache[custKey]) {
            customerId = customerCache[custKey];
          } else {
            const newCust = await prisma.customer.create({
              data: {
                name: row.customerName.trim(),
                billingAddress: "Erode, Tamil Nadu",
                stateCode: "33",
                creditDays: 30,
              },
            });
            customerId = newCust.id;
            customerCache[custKey] = newCust.id;
          }
        }

        // Auto-create Project if not existing (and not office overhead)
        if (!row.isOffice && row.siteName) {
          const prjKey = row.siteName.trim().toLowerCase();
          if (projectCache[prjKey]) {
            projectId = projectCache[prjKey];
          } else {
            // Ensure customer exists for project
            if (!customerId) {
              const defaultCustKey = `client for ${row.siteName}`.toLowerCase();
              if (customerCache[defaultCustKey]) {
                customerId = customerCache[defaultCustKey];
              } else {
                const newCust = await prisma.customer.create({
                  data: {
                    name: `Client - ${row.siteName}`,
                    billingAddress: "Erode, Tamil Nadu",
                    stateCode: "33",
                  },
                });
                customerId = newCust.id;
                customerCache[defaultCustKey] = newCust.id;
              }
            }

            const prjCount = await prisma.project.count();
            const code = `SR-PRJ-2026-${String(prjCount + 1).padStart(3, "0")}`;
            const newPrj = await prisma.project.create({
              data: {
                code,
                name: row.siteName.trim(),
                customerId,
                siteLocation: row.siteName.trim(),
                roofType: "PEB",
                contractValue: toDecimal(row.moneyIn).times(3).toFixed(2), // Initial contract estimation
                status: "IN_PROGRESS",
                assignedTeams: JSON.stringify([row.teamName || "SRM01"]),
              },
            });
            projectId = newPrj.id;
            projectCache[prjKey] = newPrj.id;
          }
        }

        const date = new Date(row.date);
        const isBank = row.paymentMode === "BANK";
        const cashOrBankAccountId = isBank ? bankAccount.id : cashAccount.id;

        if (row.txnType === "CUSTOMER_PAYMENT") {
          // Money In from Client
          const amount = toDecimal(row.moneyIn);
          const vchInfo = await getNextVoucherNumber(fy.id, "RECEIPT");
          const vchNo = row.voucherNo || vchInfo.voucherNumber;

          // Post balanced Double Entry:
          // Dr Cash/Bank
          // Cr Roofing Contracts Revenue
          const journal = await postDoubleEntryTransaction({
            voucherType: VoucherType.RECEIPT,
            financialYearId: fy.id,
            entryNumber: vchNo,
            date,
            narration: `Client Payment Received [${row.siteName}]: ${row.particulars} (Batch: ${batchNumber})`,
            createdById: defaultUser.id,
            lines: [
              {
                accountId: cashOrBankAccountId,
                debit: amount,
                credit: 0,
                narration: `Received from client via ${row.paymentMode}`,
                projectId: projectId || undefined,
                customerId: customerId || undefined,
              },
              {
                accountId: revenueAccount.id,
                debit: 0,
                credit: amount,
                narration: row.particulars,
                projectId: projectId || undefined,
                customerId: customerId || undefined,
              },
            ],
          });

          // Tag batch to journal
          await prisma.journalEntry.update({
            where: { id: journal.id },
            data: { importBatchId: importBatch.id },
          });

          // Record in CashBook
          await prisma.cashBookEntry.create({
            data: {
              voucherNumber: vchNo,
              date,
              type: "CASH_INFLOW",
              amount: amount.toFixed(2),
              purpose: row.particulars,
              category: "Customer Receipt",
              counterpartyName: row.customerName || row.siteName,
              projectId,
              teamName: row.teamName,
              financialYearId: fy.id,
              journalEntryId: journal.id,
              createdById: defaultUser.id,
              importBatchId: importBatch.id,
            },
          });

          committedCount++;
        } else {
          // Money Out: Direct Site Expense, Labour, Contractor, or Office Overhead
          const amount = toDecimal(row.moneyOut);
          const vchInfo = await getNextVoucherNumber(fy.id, "EXPENSE");
          const vchNo = row.voucherNo || vchInfo.voucherNumber;

          // Select appropriate GL account
          let debitAccountId = directMaterialAccount.id;
          let category = "MATERIAL";

          const pLower = row.particulars.toLowerCase();
          const cLower = row.category.toLowerCase();

          if (row.isOffice) {
            category = "OFFICE_OVERHEAD";
            if (pLower.includes("rent") || cLower.includes("rent")) {
              debitAccountId = officeRentAccount.id;
            } else if (pLower.includes("salar") || cLower.includes("salar") || pLower.includes("staff")) {
              debitAccountId = officeSalariesAccount.id;
            } else {
              debitAccountId = generalOfficeExpenseAccount.id;
            }
          } else if (cLower.includes("labour") || pLower.includes("labour") || pLower.includes("muster") || pLower.includes("gang")) {
            debitAccountId = labourAccount.id;
            category = "LABOUR";
          } else if (cLower.includes("contractor") || pLower.includes("contractor") || pLower.includes("fabricat") || pLower.includes("erect")) {
            debitAccountId = contractorAccount.id;
            category = "CONTRACTOR";
          } else if (cLower.includes("transport") || pLower.includes("transport") || pLower.includes("diesel") || pLower.includes("crane")) {
            debitAccountId = transportAccount.id;
            category = "TRANSPORT";
          } else if (cLower.includes("food") || pLower.includes("tea") || pLower.includes("water") || pLower.includes("tiffin")) {
            debitAccountId = siteFoodAccount.id;
            category = "FOOD_STAY";
          }

          // Post balanced Double Entry:
          // Dr Expense Account
          // Cr Cash/Bank
          const journal = await postDoubleEntryTransaction({
            voucherType: VoucherType.EXPENSE,
            financialYearId: fy.id,
            entryNumber: vchNo,
            date,
            narration: `${row.isOffice ? "Office Overhead" : `Site Expense [${row.siteName}]`}: ${row.particulars} (Team: ${row.teamName})`,
            createdById: defaultUser.id,
            lines: [
              {
                accountId: debitAccountId,
                debit: amount,
                credit: 0,
                narration: row.particulars,
                projectId: row.isOffice ? undefined : projectId || undefined,
              },
              {
                accountId: cashOrBankAccountId,
                debit: 0,
                credit: amount,
                narration: `Paid via ${row.paymentMode}`,
                projectId: row.isOffice ? undefined : projectId || undefined,
              },
            ],
          });

          // Tag batch to journal
          await prisma.journalEntry.update({
            where: { id: journal.id },
            data: { importBatchId: importBatch.id },
          });

          // Record in ExpenseClaim
          await prisma.expenseClaim.create({
            data: {
              voucherNumber: vchNo,
              date,
              accountId: debitAccountId,
              paymentMode: row.paymentMode,
              projectId: row.isOffice ? null : projectId,
              amount: amount.toFixed(2),
              purpose: row.particulars,
              category,
              isOfficeExpense: row.isOffice,
              teamName: row.teamName,
              status: "APPROVED",
              approvedById: defaultUser.id,
              approvedAt: date,
              journalEntryId: journal.id,
              importBatchId: importBatch.id,
            },
          });

          // Record in CashBook if Cash
          if (!isBank) {
            await prisma.cashBookEntry.create({
              data: {
                voucherNumber: vchNo,
                date,
                type: "CASH_OUTFLOW",
                amount: amount.toFixed(2),
                purpose: row.particulars,
                category: row.isOffice ? "Office Expenses" : "Site Expenses",
                counterpartyName: row.teamName || row.siteName,
                projectId: row.isOffice ? null : projectId,
                isOfficeExpense: row.isOffice,
                teamName: row.teamName,
                financialYearId: fy.id,
                createdById: defaultUser.id,
                importBatchId: importBatch.id,
              },
            });
          }

          committedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        action: "commit",
        batchId: importBatch.id,
        batchNumber: importBatch.batchNumber,
        committedCount,
        summary,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Accounts Excel Import Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
