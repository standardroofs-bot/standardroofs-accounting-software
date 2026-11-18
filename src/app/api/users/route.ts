import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getCurrentUserSession, getDefaultPermissionsForRole, ALL_MODULES } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      users,
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

    const body = await request.json();
    const { name, email, password, role, phone, permissions } = body;

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

    const passwordHash = await bcrypt.hash(password, 10);
    const finalPermissions = permissions || getDefaultPermissionsForRole(role as UserRole);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role as UserRole,
        phone: phone || null,
        permissions: finalPermissions,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        active: true,
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

    const body = await request.json();
    const { id, role, active, permissions, password } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (role) updateData.role = role as UserRole;
    if (active !== undefined) updateData.active = active;
    if (permissions) updateData.permissions = permissions;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        active: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
