import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + size;
  }

  const centralDir = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

function readUploadedKycFile(url?: string | null): Buffer | null {
  if (!url) return null;
  const filename = url.split("/").pop();
  if (!filename) return null;
  const diskPath = path.join(process.cwd(), "public", "uploads", "kyc", filename);
  if (fs.existsSync(diskPath)) {
    return fs.readFileSync(diskPath);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "VIEW");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const bundle = new URL(req.url).searchParams.get("bundle");
    const isSuperAdmin = String(auth.session.role || "").toUpperCase() === "SUPER_ADMIN";

    const worker = await prisma.employeeOrLabour.findUnique({
      where: { id },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 90 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 20 },
        performanceReviews: { orderBy: { month: "desc" }, take: 12 },
      },
    });

    if (!worker) {
      return NextResponse.json({ success: false, error: "Worker not found" }, { status: 404 });
    }

    const payrollHistory = await prisma.payrollItem.findMany({
      where: { employeeId: id },
      include: {
        payrollRun: {
          select: { month: true, halfPeriod: true, cycleType: true, status: true },
        },
      },
      orderBy: { payrollRun: { month: "desc" } },
      take: 36,
    });

    if (bundle === "zip") {
      const safeName = `${worker.employeeCode}_${worker.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      const profileRows = [
        { Section: "Profile", Field: "Employee Code", Value: worker.employeeCode },
        { Section: "Profile", Field: "Full Name", Value: worker.name },
        { Section: "Profile", Field: "Designation", Value: worker.designation || worker.category },
        { Section: "Profile", Field: "Company Unit", Value: worker.companyUnit },
        { Section: "Profile", Field: "Phone", Value: worker.phone || "—" },
        { Section: "Profile", Field: "Address", Value: worker.address || "—" },
        { Section: "KYC", Field: "Aadhaar", Value: worker.aadhaarNumber || "—" },
        { Section: "KYC", Field: "PAN", Value: worker.panNumber || "—" },
        { Section: "KYC", Field: "Driving License", Value: worker.drivingLicenseNumber || "—" },
        { Section: "Bank", Field: "Bank Name", Value: worker.bankName || "—" },
        { Section: "Bank", Field: "Account No", Value: worker.bankAccountNumber || worker.bankAccountNo || "—" },
        { Section: "Bank", Field: "IFSC", Value: worker.bankIfsc || worker.ifscCode || "—" },
        {
          Section: "Compensation",
          Field: "Salary / Daily Wage",
          Value: isSuperAdmin ? String(worker.monthlySalary || worker.dailyWage || 0) : "MASKED",
        },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), "Master Profile");
      if (payrollHistory.length > 0) {
        const payRows = payrollHistory.map((p) => ({
          Month: p.payrollRun?.month,
          Cycle: p.payrollRun?.halfPeriod,
          WorkingDays: p.totalWorkingDays,
          PresentDays: p.daysPresent,
          Gross: isSuperAdmin ? p.grossSalary : 0,
          Net: isSuperAdmin ? p.netSalary : 0,
          Status: p.paymentStatus,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payRows), "Payroll History");
      }
      const xlsxBuf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

      const zipEntries: Array<{ name: string; data: Buffer }> = [
        { name: `${safeName}_Master_Profile_&_Payroll.xlsx`, data: xlsxBuf },
      ];

      const structuredDocs: Array<{ label: string; url?: string | null }> = [
        { label: "Passport_Photo", url: worker.photoUrl },
        { label: "Aadhaar_Card", url: worker.aadhaarDocUrl },
        { label: "PAN_Card", url: worker.panDocUrl },
        { label: "Driving_License", url: worker.drivingLicenseDocUrl },
      ];
      if (worker.kycDocumentsJson) {
        try {
          const parsed = JSON.parse(worker.kycDocumentsJson);
          if (Array.isArray(parsed)) {
            for (const d of parsed) {
              structuredDocs.push({ label: d.label || d.fileName || "Document", url: d.url });
            }
          }
        } catch {}
      }

      const usedNames = new Set<string>();
      for (const doc of structuredDocs) {
        const fileBuf = readUploadedKycFile(doc.url);
        if (!fileBuf) continue;
        const ext = (doc.url || "").split(".").pop() || "bin";
        let entryName = `Documents/${doc.label.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
        if (usedNames.has(entryName)) {
          entryName = `Documents/${doc.label.replace(/[^a-zA-Z0-9_-]/g, "_")}_${usedNames.size}.${ext}`;
        }
        usedNames.add(entryName);
        zipEntries.push({ name: entryName, data: fileBuf });
      }

      const zipBuf = buildZipBuffer(zipEntries);
      return new NextResponse(new Uint8Array(zipBuf), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeName}_Complete_Dossier.zip"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      worker: isSuperAdmin
        ? worker
        : {
            ...worker,
            monthlySalary: null,
            dailyWage: null,
            baseWage: null,
            defaultVehicleAllowance: 0,
            salaryMasked: true,
          },
      payrollHistory: isSuperAdmin
        ? payrollHistory
        : payrollHistory.map((p) => ({
            ...p,
            baseRate: 0,
            grossSalary: 0,
            netSalary: 0,
            paidCash: 0,
            paidBankOrGpay: 0,
            paidGpay: 0,
            salaryMasked: true,
          })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
