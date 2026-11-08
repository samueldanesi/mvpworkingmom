import { desc } from "drizzle-orm";
import { closeGdprRequestAction, createGdprRequestAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { db, gdprRequests } from "@/db";
import { fmtDate } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Richieste GDPR" };

const KIND: Record<string, string> = { access: "Accesso", rectify: "Rettifica", erase: "Cancellazione", export: "Esportazione" };

/** C-09: registro e flusso per accesso, rettifica, cancellazione ed esportazione, con scadenze. */
export default async function Gdpr({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("gdpr.handle");
  const rows = await db.select().from(gdprRequests).orderBy(desc(gdprRequests.createdAt)).limit(100);
  return (
    <>
      <PageHeader title="Richieste GDPR" subtitle="Termine di risposta: 30 giorni. Le richieste fatte dall'utente in autonomia si chiudono subito e restano qui registrate." />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-1">
          <h2>Nuova richiesta</h2>
          <form action={createGdprRequestAction} className="space-y-3"><Field label="Email dell'interessato"><input name="email" type="email" required /></Field><Field label="Tipo"><select name="kind">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Note"><input name="note" /></Field><Button>Registra</Button></form>
        </Card>
        <Card className="p-0 lg:col-span-2">
          {rows.length === 0 ? <div className="p-5"><Empty>Nessuna richiesta.</Empty></div> : (
            <table><thead><tr><th>Ricevuta</th><th>Interessato</th><th>Tipo</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead><tbody>
              {rows.map((r) => { const late = r.status === "open" && r.dueAt < new Date(); return (
                <tr key={r.id}><td>{fmtDate(r.createdAt)}</td><td>{r.userEmail}</td><td>{KIND[r.kind]}</td><td>{fmtDate(r.dueAt)} {late && <Badge tone="red">scaduta</Badge>}</td><td><Badge tone={r.status === "done" ? "green" : r.status === "rejected" ? "gray" : "amber"}>{r.status}</Badge></td>
                  <td>{r.status === "open" && <form action={closeGdprRequestAction} className="flex gap-1"><input type="hidden" name="id" value={r.id} /><button name="status" value="done" className="text-xs underline">Esegui/chiudi</button><button name="status" value="rejected" className="text-xs text-red-700 underline">Rifiuta</button></form>}</td></tr>
              ); })}
            </tbody></table>
          )}
        </Card>
      </div>
    </>
  );
}
