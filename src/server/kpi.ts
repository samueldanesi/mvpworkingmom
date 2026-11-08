import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { companies, creditLedger, db, events, reports, responses, subjects, users } from "@/db";
import { computeKpis, DEFINITIONS_VERSION, type EventRow, type ResponseRow, type SubjectRow } from "@/lib/kpi-core";
import { getRules } from "./settings";

export type HrFilters = { from: Date; to: Date; site?: string; area?: string };

/** Carica i dati dell'archivio analitico per UNA azienda (T-02: contesto separato) e calcola gli indicatori. */
export async function kpisForCompany(companyId: string, f: HrFilters) {
  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!co) throw new Error("Azienda non trovata");
  const rules = await getRules();
  let subs = await db.select().from(subjects).where(and(eq(subjects.companyId, companyId), lte(subjects.registeredAt, f.to)));
  if (f.site) subs = subs.filter((s) => s.site === f.site);
  if (f.area) subs = subs.filter((s) => s.area === f.area);
  const ps = subs.map((s) => s.pseudonym);
  const evs = ps.length ? await db.select().from(events).where(and(inArray(events.pseudonym, ps), gte(events.occurredAt, f.from), lte(events.occurredAt, f.to))) : [];
  const resp = ps.length ? await db.select().from(responses).where(and(inArray(responses.pseudonym, ps), lte(responses.answeredAt, f.to))) : [];
  const out = computeKpis({
    subjects: subs as SubjectRow[],
    events: evs as EventRow[],
    responses: resp as ResponseRow[],
    coveredEmployees: co.coveredEmployees,
    includedSessions: co.includedSessions,
    kMin: rules.kMin,
  });
  const sites = [...new Set((await db.select({ s: subjects.site }).from(subjects).where(eq(subjects.companyId, companyId))).map((r) => r.s).filter(Boolean))] as string[];
  return { ...out, kMin: rules.kMin, company: co, sites };
}

/** B-05: registro crediti aggregato per l'HR; sotto soglia non si mostra il dettaglio. */
export async function creditRegistry(companyId: string) {
  const { kMin } = await getRules();
  const [r] = await db
    .select({
      granted: sql<number>`coalesce(sum(delta) filter (where reason = 'grant'),0)::int`,
      consumed: sql<number>`coalesce(-sum(delta) filter (where reason = 'consume'),0)::int`,
      refunded: sql<number>`coalesce(sum(delta) filter (where reason = 'refund'),0)::int`,
      expired: sql<number>`coalesce(-sum(delta) filter (where reason = 'expire'),0)::int`,
      users: sql<number>`count(distinct user_id)::int`,
    })
    .from(creditLedger)
    .where(eq(creditLedger.companyId, companyId));
  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const suppressed = r.users < kMin;
  return { kMin, suppressed, users: suppressed ? null : r.users, granted: r.granted, consumed: r.consumed - r.refunded, expired: r.expired, residual: r.granted - (r.consumed - r.refunded) - r.expired, seats: co.coveredEmployees };
}

/** D-07: report immutabili. Una correzione genera una nuova versione, mai una modifica. */
export async function issueReport(companyId: string, f: { from: Date; to: Date }, createdBy: string) {
  const res = await kpisForCompany(companyId, { from: f.from, to: f.to });
  const periodStart = f.from.toISOString().slice(0, 10);
  const periodEnd = f.to.toISOString().slice(0, 10);
  const prev = await db
    .select()
    .from(reports)
    .where(and(eq(reports.companyId, companyId), eq(reports.periodStart, periodStart), eq(reports.periodEnd, periodEnd)))
    .orderBy(desc(reports.version))
    .limit(1);
  const [row] = await db
    .insert(reports)
    .values({
      companyId,
      periodStart,
      periodEnd,
      version: (prev[0]?.version ?? 0) + 1,
      supersedesId: prev[0]?.id ?? null,
      definitionsVersion: DEFINITIONS_VERSION,
      kMin: res.kMin,
      sampleSize: res.sampleSize,
      payload: { kpis: res.kpis, registered: res.registered, belowThreshold: res.belowThreshold },
      createdBy,
    })
    .returning();
  return row;
}

export async function listReports(companyId: string) {
  return db.select().from(reports).where(eq(reports.companyId, companyId)).orderBy(desc(reports.createdAt));
}

export async function getReport(id: string) {
  const [r] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return r ?? null;
}

export const _u = users;
