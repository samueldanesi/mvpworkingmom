import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { companySurveys, companies, db, responses } from "@/db";
import { getRules } from "./settings";

/** B-10 / K-14: indagine aziendale anonima a tutti i dipendenti. Nessun legame con persone: pseudonimo casuale per risposta. */
export const SURVEY_ITEMS = [
  { key: "support", label: "La mia azienda mi supporta come genitore o caregiver." },
  { key: "balance", label: "Riesco a conciliare lavoro e famiglia." },
  { key: "culture", label: "In azienda si può parlare apertamente di genitorialità e cura." },
] as const;

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

export async function submitSurvey(surveyId: string, items: Record<string, number>) {
  const clean: Record<string, number> = {};
  for (const it of SURVEY_ITEMS) {
    const v = Math.round(items[it.key]);
    if (!(v >= 1 && v <= 5)) throw new Error("Rispondi a tutte le domande.");
    clean[it.key] = v;
  }
  await db.insert(responses).values({
    pseudonym: `sv_${randomBytes(8).toString("hex")}`, // casuale e usa e getta: non ricollegabile a nessuno
    instrument: "company_survey",
    version: "1",
    moment: surveyId,
    score: clean.support,
    items: clean,
  });
}

export type SurveyResult = { id: string; title: string; round: number; status: string; token: string; createdAt: Date; n: number; suppressed: boolean; agree: Record<string, number | null> };

/** Risultati aggregati con soglia minima (D-05): sotto soglia non si mostra nulla. */
export async function surveyResults(companyId: string): Promise<SurveyResult[]> {
  const { kMin } = await getRules();
  const list = await db.select().from(companySurveys).where(eq(companySurveys.companyId, companyId)).orderBy(desc(companySurveys.createdAt));
  const out: SurveyResult[] = [];
  for (const s of list) {
    const rs = await db.select().from(responses).where(and(eq(responses.instrument, "company_survey"), eq(responses.moment, s.id)));
    const suppressed = rs.length < kMin;
    const agree: Record<string, number | null> = {};
    for (const it of SURVEY_ITEMS) agree[it.key] = suppressed || !rs.length ? null : Math.round((rs.filter((r) => (r.items[it.key] ?? 0) >= 4).length / rs.length) * 100);
    out.push({ id: s.id, title: s.title, round: s.round, status: s.status, token: s.token, createdAt: s.createdAt, n: rs.length, suppressed, agree });
  }
  return out;
}

/** K-14: quota di dipendenti che percepisce supporto (risposte 4-5), ultima rilevazione e confronto con la precedente. */
export async function k14(companyId: string) {
  const { kMin } = await getRules();
  const res = (await surveyResults(companyId)).filter((r) => r.n > 0).sort((a, b) => b.round - a.round);
  const [last, prev] = res;
  if (!last || last.suppressed) return { value: null, n: last?.n ?? 0, suppressed: true, note: last ? `Meno di ${kMin} risposte: dato non mostrato.` : "Nessuna indagine ancora lanciata (B-10)." };
  const v = last.agree.support;
  const delta = prev && !prev.suppressed && prev.agree.support !== null && v !== null ? v - (prev.agree.support as number) : null;
  return { value: v, n: last.n, suppressed: false, note: delta === null ? `Rilevazione ${last.round}: «${last.title}».` : `Rilevazione ${last.round} vs ${prev.round}: ${delta >= 0 ? "+" : ""}${delta} punti percentuali.` };
}
