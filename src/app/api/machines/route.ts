import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const machines = await prisma.machineAsset.findMany({
      include: {
        allocations: {
          where: { status: "ACTIVE" },
        },
        movements: {
          orderBy: { movementDate: "desc" },
          take: 5,
        },
        repairs: {
          orderBy: { sentDate: "desc" },
          take: 5,
        },
      },
      orderBy: { sNo: "asc" },
    });

    const masterSummary = {
      totalItemsTracked: machines.length,
      totalMachineCount: machines.reduce((sum, m) => sum + m.totalCount, 0),
      srFinalWorkingCount: machines.reduce((sum, m) => sum + m.srFinalCount, 0),
      officeTotal: machines.reduce((sum, m) => sum + m.officeCount, 0),
      srm01Total: machines.reduce((sum, m) => sum + m.srm01Count, 0),
      srm02Total: machines.reduce((sum, m) => sum + m.srm02Count, 0),
      srm03Total: machines.reduce((sum, m) => sum + m.srm03Count, 0),
      srm04Total: machines.reduce((sum, m) => sum + m.srm04Count, 0),
      srm05Total: machines.reduce((sum, m) => sum + m.srm05Count, 0),
      srm06Total: machines.reduce((sum, m) => sum + m.srm06Count, 0),
      spareTotal: machines.reduce((sum, m) => sum + m.spareCount, 0),
      serviceTotal: machines.reduce((sum, m) => sum + m.serviceCount, 0),
      scrapTotal: machines.reduce((sum, m) => sum + m.scrapCount, 0),
    };

    return NextResponse.json({ success: true, machines, masterSummary });
  } catch (error: any) {
    console.error("GET /api/machines error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      category,
      officeCount,
      srm01Count,
      srm02Count,
      srm03Count,
      srm04Count,
      srm05Count,
      srm06Count,
      spareCount,
      serviceCount,
      scrapCount,
      notes,
      imageUrl,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Machine name is required." }, { status: 400 });
    }

    const count = await prisma.machineAsset.count();
    const nextSNo = count + 1;
    const assetCode = `SRM-${String(nextSNo).padStart(3, "0")}`;

    const off = Number(officeCount) || 0;
    const s1 = Number(srm01Count) || 0;
    const s2 = Number(srm02Count) || 0;
    const s3 = Number(srm03Count) || 0;
    const s4 = Number(srm04Count) || 0;
    const s5 = Number(srm05Count) || 0;
    const s6 = Number(srm06Count) || 0;
    const sp = Number(spareCount) || 0;
    const srv = Number(serviceCount) || 0;
    const scr = Number(scrapCount) || 0;

    const totalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp + srv + scr;
    const srFinalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp;

    const newMachine = await prisma.machineAsset.create({
      data: {
        assetCode,
        sNo: nextSNo,
        name: name.trim(),
        category: category || "Power Tools",
        officeCount: off,
        srm01Count: s1,
        srm02Count: s2,
        srm03Count: s3,
        srm04Count: s4,
        srm05Count: s5,
        srm06Count: s6,
        spareCount: sp,
        serviceCount: srv,
        scrapCount: scr,
        totalCount,
        srFinalCount,
        notes: notes || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({ success: true, machine: newMachine });
  } catch (error: any) {
    console.error("POST /api/machines error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      category,
      officeCount,
      srm01Count,
      srm02Count,
      srm03Count,
      srm04Count,
      srm05Count,
      srm06Count,
      spareCount,
      serviceCount,
      scrapCount,
      notes,
      imageUrl,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Machine ID is required." }, { status: 400 });
    }

    const off = Number(officeCount) || 0;
    const s1 = Number(srm01Count) || 0;
    const s2 = Number(srm02Count) || 0;
    const s3 = Number(srm03Count) || 0;
    const s4 = Number(srm04Count) || 0;
    const s5 = Number(srm05Count) || 0;
    const s6 = Number(srm06Count) || 0;
    const sp = Number(spareCount) || 0;
    const srv = Number(serviceCount) || 0;
    const scr = Number(scrapCount) || 0;

    const totalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp + srv + scr;
    const srFinalCount = off + s1 + s2 + s3 + s4 + s5 + s6 + sp;

    const updated = await prisma.machineAsset.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        officeCount: off,
        srm01Count: s1,
        srm02Count: s2,
        srm03Count: s3,
        srm04Count: s4,
        srm05Count: s5,
        srm06Count: s6,
        spareCount: sp,
        serviceCount: srv,
        scrapCount: scr,
        totalCount,
        srFinalCount,
        notes: notes !== undefined ? notes : undefined,
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    return NextResponse.json({ success: true, machine: updated });
  } catch (error: any) {
    console.error("PUT /api/machines error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
