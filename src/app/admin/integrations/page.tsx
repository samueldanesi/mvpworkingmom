import { desc } from "drizzle-orm";
import { backupAction, verifyBackupAction, runMaintenanceAction, saveRetentionAction, syncCrmAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { db, integrationLog } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { getRetention, listBackups } from "@/server/maintenance";

export const metadata = { title: "Integrazioni" };

/** Integrazioni SIMULATE (C-02, T-05, T-07, S-09), scadenza crediti (B-05) e conservazione dei dati (D-08). */
export default async function Integrations({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("staff.manage");
  const log = await db.select().from(integrationLog).orderBy(desc(integrationLog.createdAt)).limit(60);
  const ret = await getRetention();
  const backups = listBackups();
  return (
    <>
      <PageHeader title="Integrazioni e manutenzione" subtitle="Nell'MVP tutte le integrazioni esterne sono simulate: ogni operazione riesce e resta registrata qui." />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2>CRM esterno <Badge>simulato</Badge></h2>
          <p className="text-sm text-ink-600">Sincronizza le aziende e la loro fase commerciale con HubSpot / Go High Level.</p>
          <form action={syncCrmAction}><Button variant="secondary">Sincronizza ora</Button></form>
        </Card>
        <Card className="space-y-3">
          <h2>Manutenzione</h2>
          <p className="text-sm text-ink-600">Fa scadere i crediti delle aziende con contratto terminato ed elimina i dati oltre i tempi di conservazione. Gira anche dal cron (<code>/api/cron/reminders</code>).</p>
          <form action={runMaintenanceAction}><Button variant="secondary">Esegui ora</Button></form>
        </Card>
        <Card className="space-y-3 lg:col-span-2">
          <h2>Copie di sicurezza e ripristino (T-12)</h2>
          <p className="text-sm text-ink-600">Crea una copia del database e verifica che sia ripristinabile. In produzione: copie giornaliere automatiche e monitoraggio.</p>
          <form action={backupAction}><Button variant="secondary">Crea copia ora</Button></form>
          {backups.length > 0 && (
            <table><thead><tr><th>Copia</th><th>Dimensione</th><th></th></tr></thead><tbody>
              {backups.slice(0, 8).map((b) => <tr key={b.name}><td className="font-mono text-xs">{b.name}</td><td>{b.sizeKb} KB</td><td><form action={verifyBackupAction}><input type="hidden" name="name" value={b.name} /><button className="text-xs underline">Prova di ripristino</button></form></td></tr>)}
            </tbody></table>
          )}
        </Card>
        <Card className="space-y-3 lg:col-span-2">
          <h2>Tempi di conservazione (D-08)</h2>
          <Notice tone="blue">Valori di partenza: vanno concordati col DPO. I dati analitici anonimi non vengono toccati.</Notice>
          <form action={saveRetentionAction} className="grid gap-3 sm:grid-cols-5">
            <Field label="Email (giorni)"><input type="number" min="1" name="outboxDays" defaultValue={ret.outboxDays} /></Field>
            <Field label="Notifiche (giorni)"><input type="number" min="1" name="notificationsDays" defaultValue={ret.notificationsDays} /></Field>
            <Field label="Log integrazioni (giorni)"><input type="number" min="1" name="logsDays" defaultValue={ret.logsDays} /></Field>
            <Field label="Chat e note (giorni)"><input type="number" min="1" name="clinicalDays" defaultValue={ret.clinicalDays} /></Field>
            <div className="flex items-end"><Button variant="secondary">Salva</Button></div>
          </form>
        </Card>
      </div>
      <Card className="mt-6 space-y-2 p-0">
        <h2 className="p-5 pb-0">Registro operazioni simulate</h2>
        {log.length === 0 ? <div className="p-5"><Empty>Ancora nessuna operazione.</Empty></div> : (
          <table><thead><tr><th>Data</th><th>Tipo</th><th>Dettaglio</th><th>Esito</th></tr></thead><tbody>
            {log.map((l) => <tr key={l.id}><td>{fmtDateTime(l.createdAt)}</td><td><Badge>{l.kind}</Badge></td><td>{l.detail}</td><td>{l.status}</td></tr>)}
          </tbody></table>
        )}
      </Card>
    </>
  );
}
