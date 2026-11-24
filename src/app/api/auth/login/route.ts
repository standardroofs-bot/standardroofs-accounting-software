import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken, COOKIE_NAME, getDefaultPermissionsForRole } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanInput = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanInput },
          { email: `${cleanInput}@standardroofs.com` },
          {
            employeeId: {
              in: (
                await prisma.employeeOrLabour.findMany({
                  where: { employeeCode: { equals: email.trim(), mode: "insensitive" } },
                  select: { id: true },
                })
              ).map((e) => e.id),
            },
          },
        ],
      },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials or account is deactivated." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const permissions =
      (user.permissions as any) || getDefaultPermissionsForRole(user.role);

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId || undefined,
      permissions,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId || undefined,
        permissions,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
