import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const tenant = await getActiveTenantContext();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const where: any = { companyId: tenant.companyId };
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
        where: { companyId: tenant.companyId },
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
    const tenant = await getActiveTenantContext();

    // Only Super Admin can permanently purge
    if (tenant.role !== "SUPER_ADMIN" && tenant.role !== "MANAGING_DIRECTOR") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Permanent purge is restricted to Super Admin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const purgeAll = searchParams.get("all") === "true";

    if (purgeAll) {
      const deleted = await prisma.recycleBinItem.deleteMany({
        where: { companyId: tenant.companyId },
      });
      return NextResponse.json({
        success: true,
        message: `Permanently purged ${deleted.count} item(s) from ${tenant.companyName} Recycle Bin.`,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID required." }, { status: 400 });
    }

    const existing = await prisma.recycleBinItem.findFirst({
      where: { id, companyId: tenant.companyId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Item not found in active organization" }, { status: 404 });
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
