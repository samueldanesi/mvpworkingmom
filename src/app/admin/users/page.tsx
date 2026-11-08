import Link from "next/link";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { Badge, Button, Card, Empty, Field, PageHeader, str } from "@/components/ui";
import { db, users } from "@/db";
import { fmtDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Utenti" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("users.view");
  const q = str(sp.q)?.trim();
  const roleFilter = str(sp.role) as "user" | "specialist" | "hr" | "admin" | "clinical_lead" | undefined;
  const rows = await db
    .select()
    .from(users)
    .where(and(isNull(users.deletedAt), q ? or(like(users.email, `%${q}%`), like(users.fullName, `%${q}%`)) : undefined, roleFilter ? eq(users.role, roleFilter) : undefined))
    .orderBy(desc(users.createdAt))
    .limit(100);
  return (
    <>
      <PageHeader title="Utenti" subtitle="Elenco senza dati clinici. Aprire una scheda richiede un motivo e viene registrato." />
      <Card className="mb-4"><form className="flex flex-wrap items-end gap-3"><Field label="Cerca"><input name="q" defaultValue={q} placeholder="nome o email" /></Field><Field label="Ruolo"><select name="role" defaultValue={str(sp.role) ?? ""}><option value="">Tutti</option><option value="user">Utenti</option><option value="specialist">Specialisti</option><option value="hr">HR</option><option value="admin">Admin</option><option value="clinical_lead">Resp. clinico</option></select></Field><Button variant="secondary">Cerca</Button></form></Card>
      {rows.length === 0 ? <Empty>Nessun risultato.</Empty> : (
        <Card className="p-0"><table><thead><tr><th>Nome</th><th>Ruolo</th><th>Registrato</th><th>Stato</th><th></th></tr></thead><tbody>
          {rows.map((u) => <tr key={u.id}><td>{u.fullName ?? "—"}</td><td>{u.role}</td><td>{fmtDate(u.createdAt)}</td><td><Badge tone={u.status === "active" ? "green" : "red"}>{u.status}</Badge></td><td><Link href={`/admin/users/${u.id}`}>Apri…</Link></td></tr>)}
        </tbody></table></Card>
      )}
    </>
  );
}
