import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { TICKET_CATEGORIES } from "@/components/SupportViews";
import { Badge, Card, Empty, PageHeader, Sp, Stat } from "@/components/ui";
import { db, tickets, users } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Assistenza" };

/** C-06: ticket, cambio specialista, seduta saltata, rimborsi e contestazioni, con tempi di risposta misurati. */
export default async function SupportAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("tickets.handle");
  const rows = await db.select({ t: tickets, name: users.fullName }).from(tickets).leftJoin(users, eq(users.id, tickets.userId)).orderBy(desc(tickets.createdAt)).limit(100);
  const [m] = await db.select({ avgH: sql<number>`coalesce(avg((first_response_at - created_at) / 3600000.0),0)`, answered: sql<number>`count(first_response_at)` }).from(tickets);
  return (
    <>
      <PageHeader title="Assistenza e operations" />
      <Sp sp={sp} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3"><Stat label="Richieste" value={rows.length} /><Stat label="Tempo medio di prima risposta" value={m.answered ? `${m.avgH.toFixed(1)} h` : "—"} /><Stat label="Aperte" value={rows.filter((r) => r.t.status !== "closed").length} /></div>
      {rows.length === 0 ? <Empty>Nessuna richiesta.</Empty> : (
        <Card className="p-0"><table><thead><tr><th>Data</th><th>Oggetto</th><th>Categoria</th><th>Da</th><th>Stato</th></tr></thead><tbody>
          {rows.map(({ t, name }) => <tr key={t.id}><td>{fmtDateTime(t.createdAt)}</td><td><Link href={`/admin/support/${t.id}`}>{t.subject}</Link></td><td>{TICKET_CATEGORIES[t.category] ?? t.category}</td><td>{name ?? "—"}</td><td><Badge tone={t.status === "closed" ? "gray" : t.status === "pending" ? "blue" : "amber"}>{t.status}</Badge></td></tr>)}
        </tbody></table></Card>
      )}
    </>
  );
}
