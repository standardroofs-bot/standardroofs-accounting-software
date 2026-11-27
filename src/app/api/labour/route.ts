import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { serverCache, invalidateRouteCache } from "@/lib/cache";
import { syncEmployeeToOpenDraftRuns } from "@/lib/payrollAttendanceSync";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // OFFICE_STAFF, TAMIL_LABOUR, HINDI_LABOUR, CONTRACTOR_TEAM
    const status = searchParams.get("status") || "ACTIVE"; // ACTIVE, ARCHIVED, ALL
    const search = searchParams.get("search")?.toLowerCase().trim();
    const companyUnit = searchParams.get("companyUnit");

    // Contractors handling (strictly scoped by tenant.companyId)
    if (category === "CONTRACTOR_TEAM" || category === "CONTRACTOR") {
      const [contractors, srOfficeCount, inviOfficeCount, tamilCount, hindiCount, contractorCount] = await Promise.all([
        prisma.contractor.findMany({
          where: {
            companyId: tenant.companyId,
            ...(status !== "ALL" ? { status } : {}),
          },
          include: {
            dailyLogs: {
              orderBy: { date: "desc" },
              take: 10,
            },
            milestones: true,
          },
          orderBy: { code: "asc" },
        }),
        prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "OFFICE_STAFF", companyUnit: "STANDARD_ROOFS" } }),
        prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "OFFICE_STAFF", companyUnit: "INVI_CREATION" } }),
        prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "TAMIL_LABOUR" } }),
        prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "HINDI_LABOUR" } }),
        prisma.contractor.count({ where: { companyId: tenant.companyId, status: "ACTIVE" } }),
      ]);

      return NextResponse.json({
        success: true,
        labourers: contractors,
        isContractor: true,
        canRevealSalaries: tenant.isSuperAdmin,
        activeCompany: {
          id: tenant.companyId,
          code: tenant.companyCode,
          name: tenant.companyName,
          tagline: tenant.companyTagline,
        },
        segmentCounts: {
          srOffice: srOfficeCount,
          inviOffice: inviOfficeCount,
          tamil: tamilCount,
          hindi: hindiCount,
          contractor: contractorCount,
          total: srOfficeCount + inviOfficeCount + tamilCount + hindiCount + contractorCount,
        },
      });
    }

    const where: any = { companyId: tenant.companyId };
    if (status !== "ALL") where.status = status;
    if (category) where.category = category;
    if (companyUnit) where.companyUnit = companyUnit;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { empCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { aadhaarNumber: { contains: search, mode: "insensitive" } },
        { panNumber: { contains: search, mode: "insensitive" } },
        { drivingLicenseNumber: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
        { tradeSpecialty: { contains: search, mode: "insensitive" } },
      ];
    }

    const isSuperAdmin = tenant.isSuperAdmin;

    const [rawLabourers, srOfficeCount, inviOfficeCount, tamilCount, hindiCount, contractorCount] = await Promise.all([
      prisma.employeeOrLabour.findMany({
        where,
        include: {
          attendances: {
            orderBy: { date: "desc" },
            take: 5,
          },
          advances: {
            orderBy: { date: "desc" },
            take: 5,
          },
          musters: {
            orderBy: { periodEnd: "desc" },
            take: 5,
          },
          performanceReviews: {
            orderBy: { month: "desc" },
            take: 3,
          },
        },
        orderBy: [
          { companyUnit: "desc" },
          { employeeCode: "asc" },
        ],
      }),
      prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "OFFICE_STAFF", companyUnit: "STANDARD_ROOFS" } }),
      prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "OFFICE_STAFF", companyUnit: "INVI_CREATION" } }),
      prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "TAMIL_LABOUR" } }),
      prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, status: "ACTIVE", category: "HINDI_LABOUR" } }),
      prisma.contractor.count({ where: { companyId: tenant.companyId, status: "ACTIVE" } }),
    ]);

    const labourers = rawLabourers.map((w) =>
      isSuperAdmin
        ? { ...w, salaryMasked: false }
        : {
            ...w,
            monthlySalary: null,
            dailyWage: null,
            baseWage: null,
            defaultVehicleAllowance: 0,
            salaryMasked: true,
          }
    );

    return NextResponse.json({
      success: true,
      labourers,
      isContractor: false,
      canRevealSalaries: isSuperAdmin,
      activeCompany: {
        id: tenant.companyId,
        code: tenant.companyCode,
        name: tenant.companyName,
        tagline: tenant.companyTagline,
      },
      segmentCounts: {
        srOffice: srOfficeCount,
        inviOffice: inviOfficeCount,
        tamil: tamilCount,
        hindi: hindiCount,
        contractor: contractorCount,
        total: srOfficeCount + inviOfficeCount + tamilCount + hindiCount + contractorCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const session = tenant.session;
    const body = await request.json();
    const {
      name,
      employeeCode,
      empCode,
      fatherName,
      dob,
      phone,
      address,
      photoUrl,
      aadhaarNumber,
      aadhaarDocUrl,
      panNumber,
      panDocUrl,
      drivingLicenseNumber,
      drivingLicenseDocUrl,
      bankAccountName,
      bankName,
      bankAccountNo,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      designation,
      role,
      category = "TAMIL_LABOUR",
      companyUnit = "STANDARD_ROOFS",
      dailyWage = 0,
      monthlySalary = 0,
      baseWage = 0,
      specialty,
      tradeSpecialty,
      contractorLeadName,
      defaultHeadcount = 1,
      dateOfJoining,
      tenthDetails,
      twelfthDetails,
      graduationDetails,
      experienceJson,
      location,
      state,
      defaultVehicleAllowance = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    const cleanAccNo = bankAccountNumber || bankAccountNo || null;
    const cleanIfsc = bankIfsc ? bankIfsc.toUpperCase().trim() : null;
    const cleanPan = panNumber ? panNumber.toUpperCase().trim() : null;
    const cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\s+/g, "").trim() : null;

    // Handle Contractor creation
    if (category === "CONTRACTOR_TEAM" || category === "CONTRACTOR") {
      let code = employeeCode || empCode;
      if (!code) {
        const count = await prisma.contractor.count();
        code = `CON-${String(count + 1).padStart(3, "0")}`;
      }
      const contractor = await prisma.contractor.create({
        data: {
          code,
          name: name.trim(),
          specialty: tradeSpecialty || specialty || designation || "Roofing Contractor",
          fatherName: fatherName || null,
          phone: phone || null,
          address: address || null,
          aadhaarNumber: cleanAadhaar,
          panNumber: cleanPan,
          bankName: bankName || null,
          bankAccountNo: cleanAccNo,
          bankIfsc: cleanIfsc,
          ifscCode: cleanIfsc,
          category: "CONTRACTOR_TEAM",
          companyId: tenant.companyId,
          status: "ACTIVE",
          active: true,
        },
      });

      // Also create corresponding EmployeeOrLabour entry so it is 100% unified with Attendance & Payroll
      const empOrLabour = await prisma.employeeOrLabour.upsert({
        where: { employeeCode: code },
        update: {
          name: name.trim(),
          phone: phone || null,
          address: address || null,
          fatherName: fatherName || null,
          dob: dob || null,
          photoUrl: photoUrl || null,
          aadhaarNumber: cleanAadhaar,
          aadhaarDocUrl: aadhaarDocUrl || null,
          panNumber: cleanPan,
          panDocUrl: panDocUrl || null,
          bankAccountName: bankAccountName || name.trim(),
          bankName: bankName || null,
          bankAccountNo: cleanAccNo,
          bankAccountNumber: cleanAccNo,
          bankIfsc: cleanIfsc,
          bankBranch: bankBranch || null,
          contractorLeadName: contractorLeadName || fatherName || name.trim(),
          defaultHeadcount: Number(defaultHeadcount) || 1,
          tradeSpecialty: tradeSpecialty || specialty || designation || "Roofing Contractor",
          designation: "Contractor Team",
          role: "Contractor Team",
          category: "CONTRACTOR_TEAM",
          companyUnit: tenant.companyUnit,
          companyId: tenant.companyId,
          status: "ACTIVE",
          active: true,
        },
        create: {
          employeeCode: code,
          empCode: code,
          name: name.trim(),
          phone: phone || null,
          address: address || null,
          fatherName: fatherName || null,
          dob: dob || null,
          photoUrl: photoUrl || null,
          aadhaarNumber: cleanAadhaar,
          aadhaarDocUrl: aadhaarDocUrl || null,
          panNumber: cleanPan,
          panDocUrl: panDocUrl || null,
          bankAccountName: bankAccountName || name.trim(),
          bankName: bankName || null,
          bankAccountNo: cleanAccNo,
          bankAccountNumber: cleanAccNo,
          bankIfsc: cleanIfsc,
          bankBranch: bankBranch || null,
          contractorLeadName: contractorLeadName || fatherName || name.trim(),
          defaultHeadcount: Number(defaultHeadcount) || 1,
          tradeSpecialty: tradeSpecialty || specialty || designation || "Roofing Contractor",
          designation: "Contractor Team",
          role: "Contractor Team",
          category: "CONTRACTOR_TEAM",
          companyUnit: tenant.companyUnit,
          companyId: tenant.companyId,
          status: "ACTIVE",
          active: true,
        },
      });

      invalidateRouteCache("/api/labour");
      await syncEmployeeToOpenDraftRuns(tenant.companyId);
      return NextResponse.json({ success: true, labourer: contractor, unifiedRecord: empOrLabour });
    }

    // Handle Employee / Labourer creation
    const targetUnit = tenant.companyUnit;
    let code = employeeCode || empCode;
    if (!code) {
      const prefix = category === "OFFICE_STAFF" ? (targetUnit === "INVI_CREATION" ? "Invi" : "SR") : category === "HINDI_LABOUR" ? "HIN-" : "LAB-";
      const count = await prisma.employeeOrLabour.count({ where: { companyId: tenant.companyId, category } });
      code = `${prefix}${String(count + 1).padStart(3, "0")}`;
    }

    const labourer = await prisma.employeeOrLabour.create({
      data: {
        employeeCode: code,
        empCode: empCode || code.replace(/^(LAB-|HIN-)/, ""),
        name: name.trim(),
        fatherName: fatherName || null,
        dob: dob || null,
        phone: phone || null,
        address: address || null,
        photoUrl: photoUrl || null,
        aadhaarNumber: cleanAadhaar,
        aadhaarDocUrl: aadhaarDocUrl || null,
        panNumber: cleanPan,
        panDocUrl: panDocUrl || null,
        drivingLicenseNumber: drivingLicenseNumber || null,
        drivingLicenseDocUrl: drivingLicenseDocUrl || null,
        bankAccountName: bankAccountName || name.trim(),
        bankName: bankName || null,
        bankAccountNo: cleanAccNo,
        bankAccountNumber: cleanAccNo,
        bankIfsc: cleanIfsc,
        ifscCode: cleanIfsc,
        bankBranch: bankBranch || null,
        designation: designation || (category === "OFFICE_STAFF" ? (targetUnit === "INVI_CREATION" ? null : "Staff") : "Site Helper"),
        role: role || designation || (category === "OFFICE_STAFF" ? (targetUnit === "INVI_CREATION" ? null : "Staff") : "Site Helper"),
        category,
        companyUnit: targetUnit,
        companyId: tenant.companyId,
        dailyWage: toDecimal(dailyWage || (baseWage ? Number(baseWage) / 15 : category === "OFFICE_STAFF" ? 0 : 850)).toFixed(2),
        monthlySalary: toDecimal(monthlySalary || (category === "OFFICE_STAFF" ? 15000 : 0)).toFixed(2),
        baseWage: toDecimal(baseWage || (dailyWage ? Number(dailyWage) * 15 : category === "OFFICE_STAFF" ? 15000 : 12750)).toFixed(2),
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        tenthDetails: tenthDetails || null,
        twelfthDetails: twelfthDetails || null,
        graduationDetails: graduationDetails || null,
        experienceJson: experienceJson || null,
        tradeSpecialty: tradeSpecialty || null,
        location: location || "Erode",
        state: state || "Tamil Nadu",
        defaultVehicleAllowance: Number(defaultVehicleAllowance) || 0,
        status: "ACTIVE",
        active: true,
      },
    });

    invalidateRouteCache("/api/labour");
    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    console.error("Labour POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const session = tenant.session;
    const body = await request.json();
    const {
      id,
      name,
      employeeCode,
      empCode,
      fatherName,
      dob,
      phone,
      address,
      photoUrl,
      aadhaarNumber,
      aadhaarDocUrl,
      panNumber,
      panDocUrl,
      drivingLicenseNumber,
      drivingLicenseDocUrl,
      bankAccountName,
      bankName,
      bankAccountNo,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      designation,
      role,
      category,
      companyUnit,
      dailyWage,
      monthlySalary,
      baseWage,
      specialty,
      tradeSpecialty,
      contractorLeadName,
      defaultHeadcount,
      dateOfJoining,
      tenthDetails,
      twelfthDetails,
      graduationDetails,
      experienceJson,
      status,
      isContractor,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

    const cleanAccNo = bankAccountNumber || bankAccountNo || undefined;
    const cleanIfsc = bankIfsc ? bankIfsc.toUpperCase().trim() : undefined;
    const cleanPan = panNumber ? panNumber.toUpperCase().trim() : undefined;
    const cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\s+/g, "").trim() : undefined;

    if (isContractor || category === "CONTRACTOR_TEAM" || category === "CONTRACTOR") {
      const existingCon = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!existingCon) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization." }, { status: 404 });
      }
      const contractor = await prisma.contractor.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          fatherName: fatherName !== undefined ? fatherName : undefined,
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          aadhaarNumber: cleanAadhaar,
          panNumber: cleanPan,
          bankName: bankName !== undefined ? bankName : undefined,
          bankAccountNo: cleanAccNo,
          bankIfsc: cleanIfsc,
          ifscCode: cleanIfsc,
          specialty: tradeSpecialty || specialty || designation || undefined,
          status: status || undefined,
          active: status ? status !== "ARCHIVED" : undefined,
        },
      });

      // Also sync to EmployeeOrLabour if linked
      if (contractor.code) {
        await prisma.employeeOrLabour.updateMany({
          where: { employeeCode: contractor.code },
          data: {
            name: name ? name.trim() : undefined,
            phone: phone !== undefined ? phone : undefined,
            address: address !== undefined ? address : undefined,
            aadhaarNumber: cleanAadhaar,
            aadhaarDocUrl: aadhaarDocUrl !== undefined ? aadhaarDocUrl : undefined,
            panNumber: cleanPan,
            panDocUrl: panDocUrl !== undefined ? panDocUrl : undefined,
            photoUrl: photoUrl !== undefined ? photoUrl : undefined,
            bankAccountName: bankAccountName !== undefined ? bankAccountName : undefined,
            bankName: bankName !== undefined ? bankName : undefined,
            bankAccountNo: cleanAccNo,
            bankAccountNumber: cleanAccNo,
            bankIfsc: cleanIfsc,
            bankBranch: bankBranch !== undefined ? bankBranch : undefined,
            tradeSpecialty: tradeSpecialty || specialty || designation || undefined,
            contractorLeadName: contractorLeadName !== undefined ? contractorLeadName : undefined,
            defaultHeadcount: defaultHeadcount !== undefined ? Number(defaultHeadcount) : undefined,
            status: status || undefined,
            active: status ? status !== "ARCHIVED" : undefined,
          },
        });
      }

      invalidateRouteCache("/api/labour");
      await syncEmployeeToOpenDraftRuns(tenant.companyId);
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const existingEmp = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existingEmp) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization." }, { status: 404 });
    }

    const labourer = await prisma.employeeOrLabour.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        empCode: empCode || undefined,
        fatherName: fatherName !== undefined ? fatherName : undefined,
        dob: dob !== undefined ? dob : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        aadhaarNumber: cleanAadhaar,
        aadhaarDocUrl: aadhaarDocUrl !== undefined ? aadhaarDocUrl : undefined,
        panNumber: cleanPan,
        panDocUrl: panDocUrl !== undefined ? panDocUrl : undefined,
        drivingLicenseNumber: drivingLicenseNumber !== undefined ? drivingLicenseNumber : undefined,
        drivingLicenseDocUrl: drivingLicenseDocUrl !== undefined ? drivingLicenseDocUrl : undefined,
        bankAccountName: bankAccountName !== undefined ? bankAccountName : undefined,
        bankName: bankName !== undefined ? bankName : undefined,
        bankAccountNo: cleanAccNo,
        bankAccountNumber: cleanAccNo,
        bankIfsc: cleanIfsc,
        ifscCode: cleanIfsc,
        bankBranch: bankBranch !== undefined ? bankBranch : undefined,
        designation: designation !== undefined ? designation : undefined,
        role: role !== undefined ? role : designation !== undefined ? designation : undefined,
        category: category || undefined,
        companyUnit: tenant.companyUnit,
        dailyWage: dailyWage !== undefined ? toDecimal(dailyWage).toFixed(2) : undefined,
        monthlySalary: monthlySalary !== undefined ? toDecimal(monthlySalary).toFixed(2) : undefined,
        baseWage: baseWage !== undefined ? toDecimal(baseWage).toFixed(2) : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        tenthDetails: tenthDetails !== undefined ? tenthDetails : undefined,
        twelfthDetails: twelfthDetails !== undefined ? twelfthDetails : undefined,
        graduationDetails: graduationDetails !== undefined ? graduationDetails : undefined,
        experienceJson: experienceJson !== undefined ? experienceJson : undefined,
        contractorLeadName: contractorLeadName !== undefined ? contractorLeadName : undefined,
        defaultHeadcount: defaultHeadcount !== undefined ? Number(defaultHeadcount) : undefined,
        tradeSpecialty: tradeSpecialty !== undefined ? tradeSpecialty : undefined,
        status: status || undefined,
        active: status ? status !== "ARCHIVED" : undefined,
      },
    });

    invalidateRouteCache("/api/labour");
    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    console.error("Labour PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const body = await request.json();
    const { id, action = "archive", isContractor } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

    const newStatus = action === "restore" ? "ACTIVE" : "ARCHIVED";
    const newActive = action === "restore";

    if (isContractor) {
      const existingCon = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!existingCon) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization." }, { status: 404 });
      }
      const contractor = await prisma.contractor.update({
        where: { id },
        data: { status: newStatus, active: newActive },
      });
      invalidateRouteCache("/api/labour");
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const existingEmp = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existingEmp) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization." }, { status: 404 });
    }

    const labourer = await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: newStatus, active: newActive },
    });

    invalidateRouteCache("/api/labour");
    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const session = tenant.session;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const isContractor = searchParams.get("isContractor") === "true";

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

    if (isContractor) {
      const contractor = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!contractor) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization." }, { status: 404 });
      }

      // Archive record
      await prisma.contractor.update({
        where: { id },
        data: { status: "ARCHIVED", active: false },
      });

      // Soft delete to RecycleBinItem scoped to active company
      await prisma.recycleBinItem.create({
        data: {
          entityType: "EMPLOYEE_LABOUR",
          entityId: contractor.id,
          title: `Contractor: ${contractor.name} (${contractor.code || "CON"})`,
          subtitle: `Specialty: ${contractor.specialty} • Status: ARCHIVED`,
          payloadJson: JSON.stringify({ ...contractor, isContractor: true }),
          deletedBy: session?.email || "HR Manager",
          companyId: tenant.companyId,
        },
      });

      invalidateRouteCache("/api/labour");
      return NextResponse.json({ success: true, message: "Contractor safely moved to Recycle Bin." });
    }

    const labourer = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!labourer) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization." }, { status: 404 });
    }

    // Archive record
    await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: "ARCHIVED", active: false },
    });

    // Soft delete to RecycleBinItem scoped to active company
    await prisma.recycleBinItem.create({
      data: {
        entityType: "EMPLOYEE_LABOUR",
        entityId: labourer.id,
        title: `${labourer.name} (${labourer.employeeCode})`,
        subtitle: `${labourer.category} • ${labourer.designation || labourer.role || "Workforce"} • Unit: ${labourer.companyUnit}`,
        payloadJson: JSON.stringify(labourer),
        deletedBy: session?.email || "HR Manager",
        companyId: tenant.companyId,
      },
    });

    invalidateRouteCache("/api/labour");
    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, message: "Worker safely moved to Recycle Bin." });
  } catch (error: any) {
    console.error("Labour DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
