import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";

export interface KycVaultDoc {
  id: string;
  label: string;
  url: string;
  fileName: string;
  ext: string;
  uploadedAt: string;
}

function parseDocs(raw?: string | null): KycVaultDoc[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await req.json();
    const label = String(body.label || "Document").trim();
    const url = String(body.url || "").trim();
    const fileName = String(body.fileName || "file").trim();
    const ext = String(body.ext || fileName.split(".").pop() || "pdf").toUpperCase();

    if (!url) {
      return NextResponse.json({ success: false, error: "Document URL is required" }, { status: 400 });
    }

    const worker = await prisma.employeeOrLabour.findUnique({
      where: { id },
      select: { kycDocumentsJson: true },
    });
    if (!worker) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const existing = parseDocs(worker.kycDocumentsJson);
    const newDoc: KycVaultDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      url,
      fileName,
      ext,
      uploadedAt: new Date().toISOString(),
    };

    const next = body.replaceSlot
      ? [...existing.filter((d) => d.label !== label), newDoc]
      : [...existing, newDoc];

    await prisma.employeeOrLabour.update({
      where: { id },
      data: { kycDocumentsJson: JSON.stringify(next) },
    });

    return NextResponse.json({ success: true, documents: next, added: newDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("docId");
    const url = searchParams.get("url");

    const worker = await prisma.employeeOrLabour.findUnique({
      where: { id },
      select: { kycDocumentsJson: true },
    });
    if (!worker) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const existing = parseDocs(worker.kycDocumentsJson);
    const next = existing.filter((d) => (docId ? d.id !== docId : url ? d.url !== url : true));

    await prisma.employeeOrLabour.update({
      where: { id },
      data: { kycDocumentsJson: JSON.stringify(next) },
    });

    return NextResponse.json({ success: true, documents: next });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
