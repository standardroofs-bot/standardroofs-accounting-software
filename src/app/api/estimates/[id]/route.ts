import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, estimate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, terms } = body;

    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(terms !== undefined && { terms }),
      },
    });

    return NextResponse.json({ success: true, estimate: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({ where: { id } });

    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found." }, { status: 404 });
    }

    if (estimate.status === "CONVERTED") {
      return NextResponse.json(
        { success: false, error: "Cannot delete an estimate that has already been converted to an invoice." },
        { status: 400 }
      );
    }

    await prisma.estimate.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Estimate deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
