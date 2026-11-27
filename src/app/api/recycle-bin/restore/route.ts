import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";
import { syncEmployeeToOpenDraftRuns, syncOpenDraftPayrollRunsForMonth } from "@/lib/payrollAttendanceSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const isAuthorized =
      session.role === "SUPER_ADMIN" ||
      session.role === "MANAGING_DIRECTOR" ||
      session.role === "HR_MANAGER";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only Super Admin and HR can restore items." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID is required." }, { status: 400 });
    }

    const item = await prisma.recycleBinItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Recycle bin item not found." }, { status: 404 });
    }

    const payload = JSON.parse(item.payloadJson);

    // Dispatch restore based on entityType
    switch (item.entityType) {
      case "LEAVE_REQUEST": {
        const { id: origId, employee, ...dataToRestore } = payload;
        const restoredLeave = await prisma.leaveRequest.create({
          data: {
            ...dataToRestore,
            startDate: new Date(dataToRestore.startDate),
            endDate: new Date(dataToRestore.endDate),
            createdAt: dataToRestore.createdAt ? new Date(dataToRestore.createdAt) : new Date(),
            updatedAt: new Date(),
          },
        });

        // If it was APPROVED, re-apply the "A" mark on the attendance matrix
        if (restoredLeave.status === "APPROVED") {
          const start = new Date(restoredLeave.startDate);
          const end = new Date(restoredLeave.endDate);
          const curr = new Date(start);

          while (curr <= end) {
            const isSun = curr.getUTCDay() === 0;
            if (!isSun) {
              const catLabel =
                restoredLeave.leaveCategory === "PLANNED"
                  ? "Planned Leave"
                  : restoredLeave.leaveCategory === "UNPLANNED"
                  ? "Unplanned Leave"
                  : restoredLeave.leaveCategory === "SICK"
                  ? "Sick Leave"
                  : restoredLeave.leaveCategory === "EMERGENCY"
                  ? "Emergency Leave"
                  : `${restoredLeave.leaveCategory} Leave`;

              const note = restoredLeave.reason
                ? `Approved ${catLabel}: ${restoredLeave.reason}`
                : `Approved ${catLabel}`;

              await prisma.attendanceRecord.upsert({
                where: {
                  employeeId_date: {
                    employeeId: restoredLeave.employeeId,
                    date: new Date(curr),
                  },
                },
                update: {
                  status: "A",
                  workNotes: note,
                },
                create: {
                  employeeId: restoredLeave.employeeId,
                  date: new Date(curr),
                  status: "A",
                  workNotes: note,
                },
              });
            }
            curr.setUTCDate(curr.getUTCDate() + 1);
          }
        }
        break;
      }

      case "EMPLOYEE_LABOUR": {
        const { id: origId, attendances, contractorLogs, musters, advances, payrolls, leaveRequests, expenses, dailyLogs, milestones, journalLines, isContractor, ...dataToRestore } = payload;
        if (isContractor) {
          await prisma.contractor.upsert({
            where: { id: origId },
            update: {
              ...dataToRestore,
              status: "ACTIVE",
              active: true,
            },
            create: {
              id: origId,
              ...dataToRestore,
              status: "ACTIVE",
              active: true,
            },
          });
        } else {
          await prisma.employeeOrLabour.upsert({
            where: { id: origId },
            update: {
              ...dataToRestore,
              status: "ACTIVE",
              active: true,
            },
            create: {
              id: origId,
              ...dataToRestore,
              status: "ACTIVE",
              active: true,
            },
          });
        }
        break;
      }

      case "ATTENDANCE_RECORD": {
        const { id: origId, employee, ...dataToRestore } = payload;
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: dataToRestore.employeeId,
              date: new Date(dataToRestore.date),
            },
          },
          update: {
            ...dataToRestore,
            date: new Date(dataToRestore.date),
          },
          create: {
            ...dataToRestore,
            date: new Date(dataToRestore.date),
          },
        });
        break;
      }

      case "COMPANY_HOLIDAY": {
        const { id: origId, ...dataToRestore } = payload;
        await prisma.companyHoliday.create({
          data: {
            ...dataToRestore,
            date: new Date(dataToRestore.date),
          },
        });
        break;
      }

      case "INVOICE": {
        const { id: origId, customer, project, items, ...dataToRestore } = payload;
        await prisma.invoice.create({
          data: {
            ...dataToRestore,
            invoiceDate: new Date(dataToRestore.invoiceDate),
            dueDate: new Date(dataToRestore.dueDate),
            items: items ? { create: items.map(({ id, invoiceId, ...item }: any) => item) } : undefined,
          },
        });
        break;
      }

      case "EXPENSE":
      case "EXPENSE_CLAIM": {
        const { id: origId, account, bankAccount, project, employee, supplier, approvedBy, journalEntry, importBatch, ...dataToRestore } = payload;
        await prisma.expenseClaim.create({
          data: {
            ...dataToRestore,
            date: new Date(dataToRestore.date),
          },
        });
        break;
      }

      default: {
        return NextResponse.json({ success: false, error: `Unsupported entity type: ${item.entityType}` }, { status: 400 });
      }
    }

    // Remove from Recycle Bin once successfully restored
    await prisma.recycleBinItem.delete({
      where: { id },
    });

    if (item.entityType === "EMPLOYEE_LABOUR") {
      await syncEmployeeToOpenDraftRuns();
    } else if (item.entityType === "ATTENDANCE_RECORD" && payload?.date) {
      await syncOpenDraftPayrollRunsForMonth(new Date(payload.date).toISOString().slice(0, 7));
    } else if (item.entityType === "COMPANY_HOLIDAY" && payload?.date) {
      await syncOpenDraftPayrollRunsForMonth(new Date(payload.date).toISOString().slice(0, 7));
    } else if (item.entityType === "LEAVE_REQUEST" && payload?.startDate) {
      await syncOpenDraftPayrollRunsForMonth(new Date(payload.startDate).toISOString().slice(0, 7));
    }

    return NextResponse.json({
      success: true,
      message: `"${item.title}" successfully restored to original location!`,
    });
  } catch (error: any) {
    console.error("Error restoring recycle bin item:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
