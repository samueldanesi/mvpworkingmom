import { desc, eq, sql } from "drizzle-orm";
import { clearSafetyAction, handleReportAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { careRelationships, clinicalReports, db, safetyEvents, users } from "@/db";
import { audit } from "@/lib/audit";
import { decryptText } from "@/lib/crypto";
import { fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { can } from "@/lib/permissions";

export const metadata = { title: "Qualità clinica" };

/** C-11: segnalazioni, cambi specialista con motivo, indicatori per specialista. Mai chat o note. */
export default async function Clinical({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const staff = await requireStaff("clinical.reports");
  const reps = await db.select({ r: clinicalReports, name: users.fullName }).from(clinicalReports).innerJoin(users, eq(users.id, clinicalReports.specialistId)).orderBy(desc(clinicalReports.createdAt)).limit(50);
  for (const { r } of reps.slice(0, 1)) await audit(staff, "view_clinical_reports", "clinical_report", r.id, "supervisione");
  const safety = await db.select().from(safetyEvents).where(sql`${safetyEvents.clearedAt} is null`).orderBy(desc(safetyEvents.createdAt));
  const changes = await db.select({ c: careRelationships, spec: users.fullName }).from(careRelationships).innerJoin(users, eq(users.id, careRelationships.specialistId)).where(eq(careRelationships.status, "changed")).orderBy(desc(careRelationships.updatedAt)).limit(30);
  return (
    <>
      <PageHeader title="Qualità clinica" subtitle="Il responsabile clinico non legge chat e note: vede solo le segnalazioni formali." />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2>Segnalazioni degli specialisti</h2>
          {reps.length === 0 ? <Empty>Nessuna segnalazione.</Empty> : reps.map(({ r, name }) => (
            <Card key={r.id} className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{name} · {fmtDateTime(r.createdAt)}</span><span className="flex gap-1"><Badge tone={r.severity === "urgent" ? "red" : r.severity === "warning" ? "amber" : "gray"}>{r.severity}</Badge><Badge tone={r.status === "closed" ? "green" : "blue"}>{r.status}</Badge></span></div>
              <p className="whitespace-pre-wrap">{decryptText(r.bodyEnc)}</p>
              {r.outcome && <p className="text-ink-500">Esito: {r.outcome}</p>}
              {r.status !== "closed" && <form action={handleReportAction} className="flex flex-wrap items-end gap-2 border-t border-ink-100 pt-2"><input type="hidden" name="id" value={r.id} /><Field label="Stato"><select name="status"><option value="in_review">In valutazione</option><option value="closed">Chiusa</option></select></Field><Field label="Esito / nota"><input name="outcome" /></Field><Button variant="secondary">Aggiorna</Button></form>}
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <h2>Controlli di sicurezza da valutare</h2>
            <Notice tone="amber">Utenti con prenotazione sospesa dopo risposte di allarme. Non vedi le loro risposte: valuta con il team come contattarli e poi sblocca.</Notice>
            {safety.length === 0 ? <Empty>Nessuno in attesa.</Empty> : safety.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-end justify-between gap-2 text-sm">
                <span>Segnalato il {fmtDateTime(s.createdAt)} · motivo: {s.trigger === "risposta" ? "risposta al questionario" : "parola di allarme"}</span>
                {can(staff.role, "safety.clear") && <form action={clearSafetyAction} className="flex items-end gap-2"><input type="hidden" name="id" value={s.id} /><Field label="Motivo"><input name="reason" placeholder="valutazione clinica" /></Field><Button variant="secondary">Sblocca</Button></form>}
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            <h2>Cambi specialista</h2>
            {changes.length === 0 ? <Empty>Nessuno.</Empty> : <Card className="p-0"><table><thead><tr><th>Specialista</th><th>Quando</th><th>Motivo (facoltativo)</th></tr></thead><tbody>{changes.map(({ c, spec }) => <tr key={c.id}><td>{spec}</td><td>{fmtDateTime(c.updatedAt)}</td><td>{c.changeReason ?? "—"}</td></tr>)}</tbody></table></Card>}
          </div>
        </div>
      </div>
    </>
  );
}
