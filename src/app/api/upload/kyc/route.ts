import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.role === "EMPLOYEE") {
      return NextResponse.json({ success: false, error: "Forbidden: Employee cannot upload KYC records directly." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = ((formData.get("documentType") || formData.get("docType")) as string) || "document";
    const employeeId = (formData.get("employeeId") || formData.get("workerId")) as string | null;
    const employeeCode = formData.get("employeeCode") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds 15 MB limit." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const originalName = file.name || "upload";
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "png";

    const allowedExtensions = ["png", "jpg", "jpeg", "webp", "pdf", "svg", "doc", "docx", "xlsx", "xls"];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type .${ext}. Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX, XLSX` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists in public/uploads/kyc
    const uploadDir = path.join(process.cwd(), "public", "uploads", "kyc");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safePrefix = documentType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeCode = (employeeCode || "emp").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${safePrefix}_${safeCode}_${uniqueId}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/api/files/kyc/${filename}`;

    // If employeeId is provided, optionally link directly to the database column
    if (employeeId) {
      const updateData: Record<string, string> = {};
      if (documentType === "photo") {
        updateData.photoUrl = publicUrl;
      } else if (documentType === "pan") {
        updateData.panDocUrl = publicUrl;
      } else if (documentType === "aadhaar") {
        updateData.aadhaarDocUrl = publicUrl;
      } else if (documentType === "driving_license" || documentType === "dl") {
        updateData.drivingLicenseDocUrl = publicUrl;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.employeeOrLabour.update({
          where: { id: employeeId },
          data: updateData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: filename,
      originalName,
      size: file.size,
      mimeType: file.type,
      documentType,
    });
  } catch (error: any) {
    console.error("KYC Upload Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to upload file." }, { status: 500 });
  }
}
