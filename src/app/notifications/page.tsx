import Link from "next/link";
import { desc, eq, isNull, and } from "drizzle-orm";
import { Shell } from "@/components/Shell";
import { Card, Empty, PageHeader } from "@/components/ui";
import { db, notifications } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { navFor } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const u = await requireUser();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, u.id)).orderBy(desc(notifications.createdAt)).limit(50);
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
  return (
    <Shell user={u} nav={navFor(u.role)}>
      <PageHeader title="Notifiche" />
      {rows.length === 0 ? (
        <Empty>Nessuna notifica.</Empty>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n.id} className={n.readAt ? "" : "border-brand-200"}>
              <p className="text-sm">{n.href ? <Link href={n.href}>{n.text}</Link> : n.text}</p>
              <p className="mt-1 text-xs text-ink-500">{fmtDateTime(n.createdAt, u.timezone)}</p>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
