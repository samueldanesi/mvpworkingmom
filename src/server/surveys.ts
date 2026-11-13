import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { companySurveys, companies, db, responses } from "@/db";
import { getRules } from "./settings";

import { K14_QUESTION, SURVEY_E, parseSurvey, valuesOf } from "@/lib/survey-library";

/** B-10 / K-14: indagine aziendale anonima a tutti i dipendenti (survey E della libreria). Nessun legame con persone: pseudonimo casuale per risposta. */
export async function createSurvey(companyId: string, title: string) {
  const prev = await db.select().from(companySurveys).where(eq(companySurveys.companyId, companyId));
  const [s] = await db
    .insert(companySurveys)
    .values({ companyId, title, token: randomBytes(9).toString("hex"), round: prev.length + 1 })
    .returning();
  return s;
}

export async function closeSurvey(companyId: string, id: string) {
  await db.update(companySurveys).set({ status: "closed", closedAt: new Date() }).where(and(eq(companySurveys.id, id), eq(companySurveys.companyId, companyId)));
}

export async function getSurveyByToken(token: string) {
  const [s] = await db.select({ s: companySurveys, company: companies.name }).from(companySurveys).innerJoin(companies, eq(companies.id, companySurveys.companyId)).where(eq(companySurveys.token, token)).limit(1);
  return s ?? null;
}

export async function submitSurvey(surveyId: string, fd: FormData) {
  const clean = parseSurvey(SURVEY_E, (n) => fd.getAll(n).map(String));
  await db.insert(responses).values({
    pseudonym: `sv_${randomBytes(8).toString("hex")}`, // casuale e usa e getta: non ricollegabile a nessuno
    instrument: "company_survey",
    version: SURVEY_E.version,
    moment: surveyId,
    score: clean[K14_QUESTION] > 0 ? clean[K14_QUESTION] : null,
    items: clean,
  });
}

/** Sintesi di una domanda: scala = media e % 4-5; scelta singola = % per risposta; multipla = % che ha scelto ogni opzione. */
export type QuestionSummary = { id: string; text: string; kind: "scale" | "single" | "multi"; n: number; mean?: number; top?: number; shares?: { label: string; pct: number }[] };
export function summarize(rows: Record<string, number>[]): QuestionSummary[] {
  return SURVEY_E.questions.map((q) => {
    if (q.kind === "scale") {
      const v = valuesOf(rows, q.id);
      return { id: q.id, text: q.text, kind: q.kind, n: v.length, mean: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : undefined, top: v.length ? Math.round((v.filter((x) => x >= 4).length / v.length) * 100) : undefined };
    }
    if (q.kind === "single") {
      const v = valuesOf(rows, q.id);
      return { id: q.id, text: q.text, kind: q.kind, n: v.length, shares: q.options!.map((label, i) => ({ label, pct: v.length ? Math.round((v.filter((x) => x === i + 1).length / v.length) * 100) : 0 })) };
    }
    const answered = rows.filter((r) => q.options!.some((_, i) => r[`${q.id}.${i + 1}`] === 1));
    return { id: q.id, text: q.text, kind: q.kind, n: answered.length, shares: q.options!.map((label, i) => ({ label, pct: answered.length ? Math.round((answered.filter((r) => r[`${q.id}.${i + 1}`] === 1).length / answered.length) * 100) : 0 })) };
  });
}

export type SurveyResult = { id: string; title: string; round: number; status: string; token: string; createdAt: Date; n: number; suppressed: boolean; questions: QuestionSummary[]; k14: number | null };

/** Risultati aggregati con soglia minima (D-05): sotto soglia non si mostra nulla. */
export async function surveyResults(companyId: string): Promise<SurveyResult[]> {
  const { kMin } = await getRules();
  const list = await db.select().from(companySurveys).where(eq(companySurveys.companyId, companyId)).orderBy(desc(companySurveys.createdAt));
  const out: SurveyResult[] = [];
  for (const s of list) {
    const rs = await db.select().from(responses).where(and(eq(responses.instrument, "company_survey"), eq(responses.moment, s.id)));
    const suppressed = rs.length < kMin;
    const questions = suppressed ? [] : summarize(rs.map((r) => r.items));
    const k = questions.find((q) => q.id === K14_QUESTION)?.top ?? null;
    out.push({ id: s.id, title: s.title, round: s.round, status: s.status, token: s.token, createdAt: s.createdAt, n: rs.length, suppressed, questions, k14: suppressed ? null : k });
  }
  return out;
}

/** K-14: quota di dipendenti che percepisce supporto (risposte 4-5), ultima rilevazione e confronto con la precedente. */
export async function k14(companyId: string) {
  const { kMin } = await getRules();
  const res = (await surveyResults(companyId)).filter((r) => r.n > 0).sort((a, b) => b.round - a.round);
  const [last, prev] = res;
  if (!last || last.suppressed) return { value: null, n: last?.n ?? 0, suppressed: true, note: last ? `Meno di ${kMin} risposte: dato non mostrato.` : "Nessuna indagine ancora lanciata (B-10)." };
  const v = last.k14;
  const delta = prev && !prev.suppressed && prev.k14 !== null && v !== null ? v - prev.k14 : null;
  return { value: v, n: last.n, suppressed: false, note: delta === null ? `Rilevazione ${last.round}: «${last.title}».` : `Rilevazione ${last.round} vs ${prev.round}: ${delta >= 0 ? "+" : ""}${delta} punti percentuali.` };
}
