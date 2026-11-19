import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { getFullPermissions } from "../src/lib/auth";

async function main() {
  console.log("1. Re-synchronizing chart of accounts ledger balances with actual journal entries...");

  // Get all accounts
  const accounts = await prisma.account.findMany();

  for (const acc of accounts) {
    // Sum all debit and credit journal lines
    const lines = await prisma.journalLine.findMany({
      where: {
        accountId: acc.id,
        journalEntry: {
          status: "POSTED",
        },
      },
    });

    let balance = Number(acc.openingBalance || 0);

    // Depending on account type:
    // ASSET / EXPENSE: Normal debit balance (Debits increase, Credits decrease)
    // LIABILITY / EQUITY / INCOME: Normal credit balance (Credits increase, Debits decrease)
    const isDebitNormal = acc.type === "ASSET" || acc.type === "EXPENSE";

    for (const l of lines) {
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (isDebitNormal) {
        balance += (debit - credit);
      } else {
        balance += (credit - debit);
      }
    }

    await prisma.account.update({
      where: { id: acc.id },
      data: {
        currentBalance: balance,
      },
    });
  }

  // Double-check Account 4010 & 6090
  const acc4010 = await prisma.account.findUnique({ where: { code: "4010" } });
  const acc6090 = await prisma.account.findUnique({ where: { code: "6090" } });
  console.log("Account 4010 (Roofing Contracts Revenue) balance:", acc4010?.currentBalance);
  console.log("Account 6090 (Round Off / Adjustment) balance:", acc6090?.currentBalance);

  console.log("2. Setting up Super Admin credentials (admin@standardroofs.in)...");
  const fullPerms = getFullPermissions();
  const passwordHash = await bcrypt.hash("Admin@2026", 10);

  // Update or create admin@standardroofs.in as SUPER_ADMIN
  await prisma.user.upsert({
    where: { email: "admin@standardroofs.in" },
    update: {
      name: "Standard Roofs Super Admin",
      role: "SUPER_ADMIN",
      passwordHash,
      permissions: fullPerms as any,
      active: true,
      phone: "+91 8608475767",
    },
    create: {
      name: "Standard Roofs Super Admin",
      email: "admin@standardroofs.in",
      role: "SUPER_ADMIN",
      passwordHash,
      permissions: fullPerms as any,
      active: true,
      phone: "+91 8608475767",
    },
  });

  // Also make sure admin@standardroofs.com is synced
  await prisma.user.upsert({
    where: { email: "admin@standardroofs.com" },
    update: {
      name: "System Super Administrator",
      role: "SUPER_ADMIN",
      passwordHash,
      permissions: fullPerms as any,
      active: true,
    },
    create: {
      name: "System Super Administrator",
      email: "admin@standardroofs.com",
      role: "SUPER_ADMIN",
      passwordHash,
      permissions: fullPerms as any,
      active: true,
    },
  });

  console.log("✓ Super Admin accounts configured with role SUPER_ADMIN and password 'Admin@2026'");
}

main().catch(console.error).finally(() => prisma.$disconnect());
