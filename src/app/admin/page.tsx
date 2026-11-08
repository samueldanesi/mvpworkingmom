import Link from "next/link";
import { and, count, eq, isNull, lt, sql } from "drizzle-orm";
import { Card, Notice, PageHeader, Sp, Stat } from "@/components/ui";
import { clinicalReports, companies, db, events, safetyEvents, specialistProfiles, tickets, users } from "@/db";
import { requireStaff } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { creditRegistry } from "@/server/kpi";

export const metadata = { title: "Backoffice" };

const FUNNEL: [string, string][] = [
  ["registered", "Registrazione"], ["intake_done", "Questionario"], ["intro_booked", "Colloquio prenotato"], ["intro_done", "Colloquio svolto"],
  ["session_booked", "Prima seduta prenotata"], ["session_done", "Seduta svolta"], ["specialist_changed", "Cambio specialista"], ["session_late_cancel", "Annullo in ritardo"],
];

/** C-03: imbuto utente. C-04: avvisi su crediti e scadenze contratto. */
export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireStaff();
  const [{ n: nUsers }] = await db.select({ n: count() }).from(users).where(and(eq(users.role, "user"), isNull(users.deletedAt)));
  const [{ n: nSpec }] = await db.select({ n: count() }).from(specialistProfiles).where(and(eq(specialistProfiles.status, "approved"), eq(specialistProfiles.published, true)));
  const [{ n: apps }] = await db.select({ n: count() }).from(specialistProfiles).where(sql`${specialistProfiles.status} in ('received','reviewing','interview')`);
  const [{ n: openTickets }] = await db.select({ n: count() }).from(tickets).where(sql`${tickets.status} <> 'closed'`);
  const [{ n: safety }] = await db.select({ n: count() }).from(safetyEvents).where(isNull(safetyEvents.clearedAt));
  const [{ n: reportsNew }] = await db.select({ n: count() }).from(clinicalReports).where(eq(clinicalReports.status, "new"));
  const funnelRows = await db.select({ t: events.type, n: sql<number>`count(distinct pseudonym)` }).from(events).groupBy(events.type);
  const f = new Map(funnelRows.map((r) => [r.t, r.n]));
  const base = Math.max(1, ...FUNNEL.slice(0, 4).map(([k]) => f.get(k) ?? 0));

  const cos = can(u.role, "codes.manage") ? await db.select().from(companies).where(eq(companies.status, "active")) : [];
  const alerts: string[] = [];
  for (const c of cos) {
    const r = await creditRegistry(c.id);
    if (c.coveredEmployees > 0 && r.granted > 0 && r.residual / r.granted < 0.2) alerts.push(`${c.name}: crediti residui sotto il 20%`);
    if (c.endsAt && c.endsAt < new Date(Date.now() + 60 * 86_400_000)) alerts.push(`${c.name}: contratto in scadenza il ${c.endsAt.toISOString().slice(0, 10)}`);
  }
  void lt;

  return (
    <>
      <PageHeader title="Backoffice" subtitle="Panoramica operativa. Chat e note cliniche non sono mai visibili qui." />
      <Sp sp={sp} />
      {alerts.length > 0 && <div className="mb-4 space-y-2">{alerts.map((a) => <Notice key={a}>{a}</Notice>)}</div>}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Utenti" value={nUsers} /><Stat label="Specialisti attivi" value={nSpec} />
        <Stat label="Candidature" value={apps} /><Stat label="Ticket aperti" value={openTickets} />
        <Stat label="Controlli sicurezza" value={safety} hint="da valutare" /><Stat label="Segnalazioni nuove" value={reportsNew} />
      </div>
      <Card className="mt-6 space-y-3">
        <h2>Imbuto utente</h2>
        <p className="text-xs text-ink-500">Persone distinte per passaggio (dall&apos;archivio analitico, in pseudonimo).</p>
        <ul className="space-y-1.5">
          {FUNNEL.map(([k, label]) => {
            const n = f.get(k) ?? 0;
            const pct = base ? Math.round((n / base) * 100) : 0;
            return (
              <li key={k} className="flex items-center gap-3 text-sm">
                <span className="w-48 shrink-0">{label}</span>
                <div className="h-2 flex-1 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <span className="w-20 text-right tabular-nums">{n} <span className="text-ink-400">({pct}%)</span></span>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-ink-500"><Link href="/admin/audit">Registro accessi</Link> · ogni apertura di un dato personale richiede un motivo ed è tracciata.</p>
    </>
  );
}
