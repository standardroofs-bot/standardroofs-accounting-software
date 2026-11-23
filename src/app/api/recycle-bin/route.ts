import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const where: any = {};
    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }

    const [items, countsByType] = await Promise.all([
      prisma.recycleBinItem.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        take: 100,
      }),
      prisma.recycleBinItem.groupBy({
        by: ["entityType"],
        _count: { _all: true },
      }),
    ]);

    const totalCount = countsByType.reduce((acc, curr) => acc + curr._count._all, 0);

    return NextResponse.json({
      success: true,
      items,
      totalCount,
      countsByType: Object.fromEntries(countsByType.map((c) => [c.entityType, c._count._all])),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    // Only Super Admin can permanently purge
    if (session.role !== "SUPER_ADMIN" && session.role !== "MANAGING_DIRECTOR") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Permanent purge is restricted to Super Admin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const purgeAll = searchParams.get("all") === "true";

    if (purgeAll) {
      const deleted = await prisma.recycleBinItem.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `Permanently purged ${deleted.count} item(s) from Recycle Bin.`,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID required." }, { status: 400 });
    }

    await prisma.recycleBinItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Item permanently deleted from Recycle Bin.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
