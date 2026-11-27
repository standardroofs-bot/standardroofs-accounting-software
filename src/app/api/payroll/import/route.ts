import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAndImportPayrollWorkbook } from "@/lib/payrollExcelParser";
import { requireAuthorizedSession } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;
    if (auth.session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden: Only Super Admin can import workbooks." }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "Please upload an .xlsx file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parseAndImportPayrollWorkbook(buffer, prisma as any);

    return NextResponse.json({
      success: true,
      runsImported: result.runsImported,
      itemsImported: result.itemsImported,
      summary: result.summary,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/import]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to import Excel workbook" },
      { status: 500 }
    );
  }
}
