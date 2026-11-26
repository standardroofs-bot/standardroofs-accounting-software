import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("labour", "VIEW");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const employeeId = searchParams.get("employeeId");

    const where: any = {};
    if (month) where.month = month;
    if (employeeId) where.employeeId = employeeId;

    const reviews = await prisma.performanceReview.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, designation: true, category: true },
        },
      },
      orderBy: [{ month: "desc" }, { overallRating: "desc" }],
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      employeeId,
      month,
      attendanceScore = 25,
      siteExecutionScore = 25,
      punctualityScore = 25,
      safetyDisciplineScore = 25,
      recommendedIncentive = 0,
      reviewerNotes = "",
      applyToPayroll = false,
    } = body;

    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: "employeeId and month (YYYY-MM) are required." },
        { status: 400 }
      );
    }

    const att = Math.min(25, Math.max(0, Number(attendanceScore)));
    const exec = Math.min(25, Math.max(0, Number(siteExecutionScore)));
    const punc = Math.min(25, Math.max(0, Number(punctualityScore)));
    const safe = Math.min(25, Math.max(0, Number(safetyDisciplineScore)));
    const overallRating = Math.round(att + exec + punc + safe);
    const incentive = Math.max(0, Number(recommendedIncentive || 0));

    const review = await prisma.performanceReview.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month,
        },
      },
      update: {
        attendanceScore: att,
        siteExecutionScore: exec,
        punctualityScore: punc,
        safetyDisciplineScore: safe,
        overallRating,
        recommendedIncentive: incentive,
        reviewerNotes,
        reviewedBy: auth.session.name || auth.session.email,
        appliedToPayroll: Boolean(applyToPayroll),
      },
      create: {
        employeeId,
        month,
        attendanceScore: att,
        siteExecutionScore: exec,
        punctualityScore: punc,
        safetyDisciplineScore: safe,
        overallRating,
        recommendedIncentive: incentive,
        reviewerNotes,
        reviewedBy: auth.session.name || auth.session.email,
        appliedToPayroll: Boolean(applyToPayroll),
      },
    });

    let updatedPayrollItems = 0;
    if (applyToPayroll) {
      const items = await prisma.payrollItem.findMany({
        where: {
          employeeId,
          payrollRun: { month },
        },
      });

      for (const it of items) {
        const netSalary = Math.round(
          it.grossSalary +
            incentive +
            it.nightDutyAmount +
            (it.vehicleAllowance || 0) +
            it.lastMonthBalance -
            it.advanceDeduction -
            it.expenseBalanceDeduction
        );
        const totalPaid = it.paidCash + it.paidBankOrGpay + (it.paidGpay || 0);
        const carryForwardBalance = Math.round((netSalary - totalPaid) * 100) / 100;

        await prisma.payrollItem.update({
          where: { id: it.id },
          data: {
            otAndIncentive: incentive,
            performanceScore: overallRating,
            netSalary,
            carryForwardBalance,
          },
        });
        await recalculatePayrollRunTotals(it.payrollRunId, prisma as any);
        updatedPayrollItems++;
      }
    }

    return NextResponse.json({
      success: true,
      review,
      updatedPayrollItems,
      message: applyToPayroll
        ? `KPI ${overallRating}/100 saved & ₹${incentive} incentive applied to ${month} payroll.`
        : `KPI ${overallRating}/100 saved.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
