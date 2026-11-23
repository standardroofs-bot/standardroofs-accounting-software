import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    // Only Super Admin, MD, or HR Manager can change passwords
    const isAuthorized =
      session.role === "SUPER_ADMIN" ||
      session.role === "MANAGING_DIRECTOR" ||
      session.role === "HR_MANAGER";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only Super Admin and HR can reset passwords." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, email, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: "Target User ID or Email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId || undefined }, { email: email || undefined }],
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Password successfully updated for ${user.name} (${user.email}).`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
