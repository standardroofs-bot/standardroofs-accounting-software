import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: "sr_company_config" },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: "sr_company_config",
          companyName: "Standard Roofs",
          tagline: "Roofing & PEB Structure Specialists",
          gstin: "33AABCS1234F1Z5",
          pan: "AABCS1234F",
          state: "Tamil Nadu",
          stateCode: "33",
          address: "12/4, Perundurai Road, Near Collectorate, Erode - 638011, Tamil Nadu",
          phone: "+91 98427 12345",
          email: "accounts@standardroofs.com",
          bankName: "HDFC Bank",
          bankBranch: "Erode Main Branch",
          bankAccountNo: "50200012345678",
          bankIfsc: "HDFC0001234",
          invoiceFormat: "PREFIX",
          invoiceNextNo: 33,
        },
      });
    }

    const invoiceSeq = await prisma.voucherSequence.findFirst({
      where: { voucherType: "INVOICE" },
    });

    return NextResponse.json({
      success: true,
      settings,
      invoiceSequence: invoiceSeq,
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      tagline,
      gstin,
      pan,
      address,
      phone,
      email,
      bankName,
      bankBranch,
      bankAccountNo,
      bankIfsc,
      invoiceFormat,
      invoiceNextNo,
    } = body;

    const updated = await prisma.companySettings.upsert({
      where: { id: "sr_company_config" },
      update: {
        companyName,
        tagline,
        gstin,
        pan,
        address,
        phone,
        email,
        bankName,
        bankBranch,
        bankAccountNo,
        bankIfsc,
        invoiceFormat,
        invoiceNextNo: parseInt(invoiceNextNo) || 33,
      },
      create: {
        id: "sr_company_config",
        companyName,
        tagline,
        gstin,
        pan,
        address,
        phone,
        email,
        bankName,
        bankBranch,
        bankAccountNo,
        bankIfsc,
        invoiceFormat,
        invoiceNextNo: parseInt(invoiceNextNo) || 33,
      },
    });

    // Update VoucherSequence nextNumber if provided
    if (invoiceNextNo) {
      const num = parseInt(invoiceNextNo);
      const seq = await prisma.voucherSequence.findFirst({
        where: { voucherType: "INVOICE" },
      });
      if (seq) {
        await prisma.voucherSequence.update({
          where: { id: seq.id },
          data: { nextNumber: num },
        });
      }
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
