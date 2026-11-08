import { desc, eq } from "drizzle-orm";
import { Card, Field, Button, PageHeader, str } from "@/components/ui";
import { auditLog, db } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Registro accessi" };

/** C-08 / P-06: registro degli accessi consultabile da chi controlla la privacy. Solo lettura. */
export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("audit.view");
  const action = str(sp.action);
  const rows = await db.select().from(auditLog).where(action ? eq(auditLog.action, action) : undefined).orderBy(desc(auditLog.createdAt)).limit(200);
  return (
    <>
      <PageHeader title="Registro accessi" subtitle="Chi, quando, perché. Il registro non si modifica dall'interfaccia." />
      <Card className="mb-4"><form className="flex items-end gap-3"><Field label="Azione"><input name="action" defaultValue={action} placeholder="es. view_user" /></Field><Button variant="secondary">Filtra</Button></form></Card>
      <Card className="p-0"><table><thead><tr><th>Quando</th><th>Ruolo</th><th>Azione</th><th>Oggetto</th><th>Motivo</th><th>IP</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{fmtDateTime(r.createdAt)}</td><td>{r.actorRole ?? "—"}</td><td>{r.action}</td><td className="font-mono text-xs">{r.subjectType} {r.subjectId?.slice(0, 8)}</td><td>{r.reason}</td><td>{r.ip}</td></tr>)}
      </tbody></table></Card>
    </>
  );
}
