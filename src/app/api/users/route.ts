import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getCurrentUserSession, getDefaultPermissionsForRole, ALL_MODULES } from "@/lib/auth";
import { getActiveTenantContext } from "@/lib/tenant";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const tenant = await getActiveTenantContext();

    const whereClause: any = tenant.isGroupSuperAdmin
      ? {}
      : {
          companyAccess: {
            some: { companyId: tenant.companyId },
          },
        };

    const [users, companies] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          active: true,
          defaultCompanyId: true,
          permissions: true,
          createdAt: true,
          companyAccess: {
            select: {
              companyId: true,
              role: true,
              isDefault: true,
              company: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, tagline: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      users,
      companies,
      activeCompanyId: tenant.companyId,
      availableModules: ALL_MODULES,
      roles: Object.values(UserRole),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "MANAGING_DIRECTOR")) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin or Managing Director can create users." },
        { status: 403 }
      );
    }
    const tenant = await getActiveTenantContext();

    const body = await request.json();
    const { name, email, password, role, phone, permissions, companyIds } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists." },
        { status: 400 }
      );
    }

    // Lock non-Group admins to creating users solely inside their active company
    const targetCompanyIds: string[] =
      tenant.isGroupSuperAdmin && Array.isArray(companyIds) && companyIds.length > 0
        ? companyIds
        : [tenant.companyId];
    const defaultCompanyId = targetCompanyIds[0];

    const passwordHash = await bcrypt.hash(password, 10);
    const finalPermissions = permissions || getDefaultPermissionsForRole(role as UserRole);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role as UserRole,
        phone: phone || null,
        defaultCompanyId,
        permissions: finalPermissions,
        active: true,
        companyAccess: {
          create: targetCompanyIds.map((cid, idx) => ({
            companyId: cid,
            role: role as UserRole,
            isDefault: idx === 0,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        defaultCompanyId: true,
        permissions: true,
        active: true,
        companyAccess: {
          select: { companyId: true, role: true, isDefault: true, company: { select: { id: true, code: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "MANAGING_DIRECTOR")) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin or Managing Director can update permissions." },
        { status: 403 }
      );
    }
    const tenant = await getActiveTenantContext();

    const body = await request.json();
    const { id, role, active, permissions, password, companyIds } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (role) updateData.role = role as UserRole;
    if (active !== undefined) updateData.active = active;
    if (permissions) updateData.permissions = permissions;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    if (tenant.isGroupSuperAdmin && Array.isArray(companyIds) && companyIds.length > 0) {
      updateData.defaultCompanyId = companyIds[0];
      await prisma.userCompanyAccess.deleteMany({
        where: { userId: id, companyId: { notIn: companyIds } },
      });
      for (let i = 0; i < companyIds.length; i++) {
        const cid = companyIds[i];
        await prisma.userCompanyAccess.upsert({
          where: { userId_companyId: { userId: id, companyId: cid } },
          update: {
            ...(role ? { role: role as UserRole } : {}),
            isDefault: i === 0,
          },
          create: {
            userId: id,
            companyId: cid,
            role: (role || UserRole.VIEWER) as UserRole,
            isDefault: i === 0,
          },
        });
      }
    } else if (role) {
      await prisma.userCompanyAccess.updateMany({
        where: { userId: id, companyId: tenant.companyId },
        data: { role: role as UserRole },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        defaultCompanyId: true,
        permissions: true,
        active: true,
        companyAccess: {
          select: { companyId: true, role: true, isDefault: true, company: { select: { id: true, code: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "MANAGING_DIRECTOR")) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin or Managing Director can delete users." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    if (session.userId === id) {
      return NextResponse.json({ success: false, error: "You cannot delete your own active account." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
