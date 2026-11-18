import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { postDoubleEntryTransaction } from "@/lib/accounting";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId");
    const projectId = searchParams.get("projectId");

    const where: any = {};
    if (materialId) where.materialId = materialId;
    if (projectId) where.projectId = projectId;

    const movements = await prisma.materialStockMovement.findMany({
      where,
      include: {
        material: true,
        project: { select: { id: true, code: true, name: true, siteLocation: true } },
        supplier: { select: { id: true, name: true } },
        journalEntry: { select: { id: true, entryNumber: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, movements });
  } catch (error: any) {
    console.error("GET /api/inventory/movements error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      materialId,
      movementType, // STOCK_IN, SITE_ISSUE, DAMAGE_RETURN
      quantity,
      unitCost,
      projectId,
      supplierId,
      referenceNo,
      notes,
      date,
    } = body;

    const qty = toDecimal(quantity || 0);
    if (qty.lessThanOrEqualTo(0)) throw new Error("Quantity must be greater than zero");

    const material = await prisma.materialItem.findUnique({ where: { id: materialId } });
    if (!material) throw new Error("Material item not found");

    const cost = unitCost !== undefined ? toDecimal(unitCost) : toDecimal(material.unitCost);
    const totalValue = qty.times(cost);

    // Active FY
    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.financialYear.findFirst();
    if (!fy) throw new Error("No active financial year found");

    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No admin user found");

    // Movement number
    const count = await prisma.materialStockMovement.count();
    const movementNumber = `STK/26-27/${String(count + 1).padStart(4, "0")}`;

    let journalEntryId: string | null = null;

    // Double-entry accounting for SITE_ISSUE
    if (movementType === "SITE_ISSUE" && totalValue.greaterThan(0)) {
      // Find Inventory Asset account (1030)
      let inventoryAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "1030" },
            { name: { contains: "Inventory", mode: "insensitive" } },
          ],
        },
      });
      if (!inventoryAccount) {
        inventoryAccount = await prisma.account.findFirst({ where: { subType: "CURRENT_ASSET" } });
      }

      // Find Material Cost account (5020 or 5010)
      let costAccount = await prisma.account.findFirst({
        where: {
          OR: [
            { code: "5020" },
            { code: "5010" },
            { name: { contains: "Roofing Material", mode: "insensitive" } },
            { name: { contains: "Steel", mode: "insensitive" } },
          ],
        },
      });
      if (!costAccount) {
        costAccount = await prisma.account.findFirst({ where: { type: "EXPENSE" } });
      }

      if (inventoryAccount && costAccount) {
        let prjDesc = "Site Dispatch";
        if (projectId) {
          const prj = await prisma.project.findUnique({ where: { id: projectId } });
          if (prj) prjDesc = `Project ${prj.code} (${prj.name})`;
        }

        const narration = `Issue ${qty} ${material.unit} of ${material.name} to ${prjDesc} [${movementNumber}]`;

        const lines = [
          {
            accountId: costAccount.id,
            debit: totalValue,
            credit: toDecimal(0),
            narration: `Material consumption - ${material.name} (${qty} ${material.unit})`,
            projectId: projectId || undefined,
          },
          {
            accountId: inventoryAccount.id,
            debit: toDecimal(0),
            credit: totalValue,
            narration: `Inventory issued from Erode Yard - ${movementNumber}`,
            projectId: projectId || undefined,
          },
        ];

        const jEntry = await postDoubleEntryTransaction({
          date: date ? new Date(date) : new Date(),
          voucherType: "INVENTORY_MOVEMENT",
          narration,
          financialYearId: fy.id,
          lines,
          createdById: adminUser.id,
          referenceNumber: movementNumber,
        });

        journalEntryId = jEntry.id;
      }
    }

    // Execute transaction: Record movement and update stock
    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.materialStockMovement.create({
        data: {
          movementNumber,
          date: date ? new Date(date) : new Date(),
          materialId,
          movementType,
          quantity: new Decimal(qty.toString()),
          unitCost: new Decimal(cost.toString()),
          totalValue: new Decimal(totalValue.toString()),
          projectId: projectId || null,
          supplierId: supplierId || null,
          referenceNo,
          notes,
          journalEntryId,
        },
      });

      // Update material stock
      let newStock = toDecimal(material.currentStock);
      if (movementType === "STOCK_IN") {
        newStock = newStock.plus(qty);
      } else {
        newStock = newStock.minus(qty);
      }

      await tx.materialItem.update({
        where: { id: materialId },
        data: {
          currentStock: new Decimal(newStock.toString()),
          unitCost: cost.greaterThan(0) ? new Decimal(cost.toString()) : undefined,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "MaterialStockMovement",
          entityId: created.id,
          newValues: JSON.stringify({
            movementNumber,
            material: material.name,
            movementType,
            qty: qty.toString(),
            totalValue: totalValue.toString(),
          }),
          performedById: adminUser.id,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, movement });
  } catch (error: any) {
    console.error("POST /api/inventory/movements error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
