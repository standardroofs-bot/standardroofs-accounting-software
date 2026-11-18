import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      batches: batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        fileName: b.fileName,
        fileType: b.fileType,
        totalRows: b.totalRows,
        totalInflow: Number(b.totalInflow),
        totalOutflow: Number(b.totalOutflow),
        sitesCount: b.sitesCount,
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt.toISOString(),
        createdByName: b.createdBy?.name || "System Admin",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
