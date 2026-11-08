import { desc, eq, sql } from "drizzle-orm";
import { publishSpecialistAction, reviewProfileChangesAction, setSpecialistStatusAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { appointments, db, specialistDocuments, specialistProfiles, users } from "@/db";
import { SPECIALTIES } from "@/lib/constants";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Specialisti" };

const STATES = ["received", "reviewing", "interview", "approved", "rejected", "suspended"] as const;
const LABEL: Record<string, string> = { received: "Ricevuta", reviewing: "In valutazione", interview: "Colloquio", approved: "Approvata", rejected: "Rifiutata", suspended: "Sospeso" };

/** S-01 / S-03 / C-05: pipeline di reclutamento, approvazione manuale, capacità e qualità. */
export default async function Specialists({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("specialists.review");
  const rows = await db.select({ p: specialistProfiles, u: users }).from(specialistProfiles).innerJoin(users, eq(users.id, specialistProfiles.userId)).orderBy(desc(specialistProfiles.createdAt));
  const stats = await db.select({ id: appointments.specialistId, done: sql<number>`count(*) filter (where status='completed')::int`, noShow: sql<number>`count(*) filter (where status='no_show_user')::int`, cancelledBy: sql<number>`count(*) filter (where status='cancelled_by_specialist')::int`, booked: sql<number>`count(*) filter (where status='booked')::int` }).from(appointments).groupBy(appointments.specialistId);
  const st = new Map(stats.map((s) => [s.id, s]));
  const docs = await db.select().from(specialistDocuments);
  return (
    <>
      <PageHeader title="Specialisti" subtitle="Approvazione manuale a cura del responsabile clinico." />
      <Sp sp={sp} />
      {rows.length === 0 ? <Empty>Nessuno.</Empty> : (
        <div className="space-y-4">
          {rows.map(({ p, u }) => {
            const s = st.get(u.id);
            const mine = docs.filter((d) => d.specialistId === u.id);
            return (
              <Card key={u.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3>{u.fullName}</h3><p className="text-sm text-ink-500">{u.email} · {p.title}</p><p className="text-xs text-ink-500">{p.registryName} n. {p.registryNumber} · RC {p.rcPolicyNumber}</p></div>
                  <div className="flex gap-2"><Badge tone={p.status === "approved" ? "green" : p.status === "rejected" || p.status === "suspended" ? "red" : "amber"}>{LABEL[p.status]}</Badge>{p.published && <Badge tone="brand">Pubblicato</Badge>}</div>
                </div>
                <p className="text-sm text-ink-700">{p.specializations.map((x) => SPECIALTIES[x] ?? x).join(", ") || "—"}</p>
                {p.cvText && <details className="text-sm"><summary className="cursor-pointer text-brand-700">Curriculum</summary><p className="mt-1 whitespace-pre-wrap text-ink-700">{p.cvText}</p></details>}
                {mine.length > 0 && <p className="text-sm">Documenti: {mine.map((d) => <a key={d.id} href={`/api/specialist-docs/${d.id}`} className="mr-3">{d.filename}</a>)}</p>}
                {p.status === "approved" && s && <p className="text-xs text-ink-500">Capacità {p.weeklyCapacity}/sett. · svolte {s.done} · assenze utenti {s.noShow} · annullate dallo specialista {s.cancelledBy} · in agenda {s.booked}</p>}
                {p.pendingChanges && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-medium">Modifiche al profilo in attesa</p>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">{JSON.stringify(p.pendingChanges, null, 1)}</pre>
                    <div className="mt-2 flex gap-2">
                      {["approve", "reject"].map((d) => <form key={d} action={reviewProfileChangesAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="decision" value={d} /><Button variant={d === "approve" ? "primary" : "secondary"}>{d === "approve" ? "Approva e pubblica" : "Respingi"}</Button></form>)}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-3 border-t border-ink-100 pt-3">
                  <form action={setSpecialistStatusAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={u.id} /><Field label="Stato"><select name="status" defaultValue={p.status}>{STATES.map((x) => <option key={x} value={x}>{LABEL[x]}</option>)}</select></Field><Field label="Nota (inviata allo specialista)"><input name="note" defaultValue={p.statusNote ?? ""} /></Field><Button variant="secondary">Aggiorna</Button></form>
                  {p.status === "approved" && <form action={publishSpecialistAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="publish" value={p.published ? "0" : "1"} /><Button variant={p.published ? "secondary" : "primary"}>{p.published ? "Ritira profilo" : "Pubblica profilo"}</Button></form>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
