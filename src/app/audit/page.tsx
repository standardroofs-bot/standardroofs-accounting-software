import { prisma } from "@/lib/prisma";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditLogs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      performedBy: { select: { name: true, role: true } },
    },
  });

  return <AuditClient initialLogs={JSON.parse(JSON.stringify(auditLogs))} />;
}
