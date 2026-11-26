import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUserSession, hasModulePermission } from "@/lib/auth";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.role === "EMPLOYEE") {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const { path: segments } = await context.params;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ success: false, error: "File path is required." }, { status: 400 });
    }

    const folder = segments[0]?.toLowerCase() || "";
    if (folder === "kyc" && !hasModulePermission(session, "labour", "view")) {
      return NextResponse.json({ success: false, error: "Forbidden: Missing HR/KYC access." }, { status: 403 });
    }
    if ((folder === "bills" || folder === "suppliers") && !hasModulePermission(session, "suppliers", "view")) {
      return NextResponse.json({ success: false, error: "Forbidden: Missing supplier document access." }, { status: 403 });
    }
    if (folder === "expenses" && !hasModulePermission(session, "expenses", "view")) {
      return NextResponse.json({ success: false, error: "Forbidden: Missing expense photo access." }, { status: 403 });
    }

    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsRoot, ...segments);

    // Prevent directory traversal
    if (!targetPath.startsWith(uploadsRoot + path.sep) && targetPath !== uploadsRoot) {
      return NextResponse.json({ success: false, error: "Invalid file path." }, { status: 400 });
    }

    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileBuffer = fs.readFileSync(targetPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(targetPath)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to serve file." }, { status: 500 });
  }
}
