import Link from "next/link";
import { eq } from "drizzle-orm";
import { calendarAction } from "@/app/actions/extra";
import { calendarState } from "@/lib/integrations";
import { addAvailabilityAction, addExceptionAction, removeAvailabilityAction, removeExceptionAction } from "@/app/actions/specialist";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { availabilityExceptions, availabilityRules, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, fmtDateTime, minToHM } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";
import { agendaFor } from "@/server/specialist";

export const metadata = { title: "Agenda" };

/** S-04: disponibilità ricorrenti ed eccezioni, slot diversi per colloquio (20 min) e seduta. */
export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const rules = (await db.select().from(availabilityRules).where(eq(availabilityRules.specialistId, u.id))).sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin);
  const exc = await db.select().from(availabilityExceptions).where(eq(availabilityExceptions.specialistId, u.id));
  const appts = await agendaFor(u.id, new Date(Date.now() - 14 * 86_400_000), new Date(Date.now() + 30 * 86_400_000));
  const cal = { google: await calendarState(u.id, "google"), outlook: await calendarState(u.id, "outlook") };
  return (
    <>
      <PageHeader title="Agenda" subtitle={`Gli orari sono nel tuo fuso: ${u.timezone}.`} />
      <Sp sp={sp} />
      <Card className="mb-6 space-y-2">
        <h2>Sincronizzazione calendari <Badge>simulata</Badge></h2>
        <p className="text-sm text-ink-600">Collega il tuo calendario: gli appuntamenti confermati vi compaiono e le tue occupazioni bloccano gli slot. Ogni appuntamento ha comunque il file .ics.</p>
        <div className="flex flex-wrap gap-3">
          {(["google", "outlook"] as const).map((p) => (
            <form key={p} action={calendarAction} className="flex items-center gap-2 text-sm">
              <input type="hidden" name="provider" value={p} /><input type="hidden" name="op" value={cal[p] ? "disconnect" : "connect"} />
              <span>{p === "google" ? "Google Calendar" : "Outlook"}: {cal[p] ? <Badge tone="green">collegato</Badge> : <Badge>non collegato</Badge>}</span>
              <Button variant="secondary">{cal[p] ? "Scollega" : "Collega"}</Button>
            </form>
          ))}
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2>Disponibilità ricorrenti</h2>
            {rules.length === 0 ? <Empty>Nessuna disponibilità.</Empty> : (
              <ul className="divide-y divide-ink-100 text-sm">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <span>{WEEKDAYS[r.weekday]} {minToHM(r.startMin)}–{minToHM(r.endMin)} <Badge tone={r.kind === "intro" ? "blue" : "brand"}>{r.kind === "intro" ? "Colloqui (20 min)" : "Sedute"}</Badge></span>
                    <form action={removeAvailabilityAction}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-700 underline">Rimuovi</button></form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addAvailabilityAction} className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 sm:grid-cols-4">
              <Field label="Giorno"><select name="weekday">{WEEKDAYS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></Field>
              <Field label="Dalle"><input name="start" type="time" defaultValue="09:00" required /></Field>
              <Field label="Alle"><input name="end" type="time" defaultValue="13:00" required /></Field>
              <Field label="Tipo"><select name="kind"><option value="session">Sedute</option><option value="intro">Colloqui gratuiti</option></select></Field>
              <div className="col-span-2 sm:col-span-4"><Button variant="secondary">Aggiungi</Button></div>
            </form>
          </Card>
          <Card className="space-y-3">
            <h2>Giorni liberi / ferie</h2>
            <ul className="text-sm">{exc.map((e) => <li key={e.id} className="flex items-center justify-between py-1">{e.day} {e.note && `· ${e.note}`}<form action={removeExceptionAction}><input type="hidden" name="id" value={e.id} /><button className="text-xs text-red-700 underline">Rimuovi</button></form></li>)}</ul>
            <form action={addExceptionAction} className="flex items-end gap-2"><Field label="Giorno"><input name="day" type="date" required /></Field><Field label="Nota"><input name="note" /></Field><Button variant="secondary">Aggiungi</Button></form>
          </Card>
        </div>
        <Card className="space-y-3">
          <h2>Appuntamenti (ultimi 14 giorni e prossimi 30)</h2>
          {appts.length === 0 ? <Empty>Nessun appuntamento.</Empty> : (
            <ul className="divide-y divide-ink-100 text-sm">
              {appts.map(({ a, name }) => {
                const [label, tone] = STATUS_LABEL[a.status];
                return (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <span><Link href={`/specialist/appointments/${a.id}`}>{fmtDateTime(a.startsAt, u.timezone)}</Link><br /><span className="text-ink-500">{a.kind === "intro" ? "Colloquio" : "Seduta"} · {name}</span></span>
                    <Badge tone={tone}>{label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
