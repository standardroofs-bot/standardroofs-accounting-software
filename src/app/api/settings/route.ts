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
          orgId: "60069196862",
          portalName: "standardroofs1",
          contactPerson: "Prabhakaran T",
          tagline: "Roofing & PEB Structure Specialists",
          gstin: "33AEWFS5187G1ZD",
          pan: "AEWFS5187G",
          state: "Tamil Nadu",
          stateCode: "33",
          address: "144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu, India – 638107",
          phone: "+91 8608475767",
          email: "info@standardroofs.in",
          website: "https://www.standardroofs.in/",
          bankName: "ICICI Bank",
          bankAccountName: "Standard Roofs (ICICI, xxxx3161)",
          bankBranch: "Kagam, Erode",
          bankAccountNo: "155205003161",
          bankIfsc: "ICIC0001552",
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
