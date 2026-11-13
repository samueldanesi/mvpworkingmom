import { and, eq, inArray } from "drizzle-orm";
import { db, responses, subjects } from "@/db";
import { mean, SURVEY_A, SURVEY_C, valuesOf } from "@/lib/survey-library";
import { getRules } from "./settings";

export type Line = { label: string; value: string };
export type ImpactBlock = { title: string; n: number; suppressed: boolean; lines: Line[] };

const r1 = (v: number | null) => (v === null ? "—" : String(Math.round(v * 10) / 10));
const pct = (num: number, den: number) => (den ? `${Math.round((num / den) * 100)}%` : "—");
const sign = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 10) / 10}`);
const dist = (rows: Record<string, number>[], id: string, labels: string[]) => {
  const v = valuesOf(rows, id);
  return labels.map((l, i) => `${l} ${pct(v.filter((x) => x === i + 1).length, v.length)}`).join(" · ");
};
const opt = (sv: typeof SURVEY_A, id: string) => sv.questions.find((q) => q.id === id)!.options!;

/**
 * Survey A (baseline) e C (90 giorni): numeri aggregati per l'azienda, solo da chi ha dato il consenso statistico,
 * solo sopra la soglia minima (D-05). La variazione A→C è calcolata su chi ha risposto a entrambe (stesso pseudonimo, che l'azienda non vede mai).
 */
export async function impactSurveys(companyId: string): Promise<{ baseline: ImpactBlock; impact: ImpactBlock }> {
  const { kMin } = await getRules();
  const subs = await db.select().from(subjects).where(and(eq(subjects.companyId, companyId), eq(subjects.consentAggregate, true)));
  const ps = subs.map((s) => s.pseudonym);
  const rows = ps.length ? await db.select().from(responses).where(and(inArray(responses.pseudonym, ps), inArray(responses.instrument, ["kpi_a", "kpi_c"]))) : [];
  const A = new Map(rows.filter((r) => r.instrument === "kpi_a").map((r) => [r.pseudonym, r.items]));
  const C = new Map(rows.filter((r) => r.instrument === "kpi_c").map((r) => [r.pseudonym, r.items]));
  const a = [...A.values()];

  const baseline: ImpactBlock = { title: "Punto di partenza (survey A)", n: a.length, suppressed: a.length < kMin, lines: [] };
  if (!baseline.suppressed) {
    const a1 = valuesOf(a, "A1");
    const a2 = valuesOf(a, "A2");
    baseline.lines = [
      { label: "Difficoltà di conciliazione (1-5)", value: `media ${r1(mean(a1))} · ${pct(a1.filter((x) => x >= 4).length, a1.length)} con 4-5` },
      { label: "Intenzione di uscita per motivi familiari", value: `${pct(a2.filter((x) => x >= 4).length, a2.length)} «spesso» o «molto spesso»` },
      { label: "Supporto aziendale percepito (1-5)", value: `media ${r1(mean(valuesOf(a, "A3")))}` },
      { label: "Conoscenza delle misure", value: dist(a, "A4", opt(SURVEY_A, "A4")) },
      { label: "Benessere percepito (1-5)", value: `media ${r1(mean(valuesOf(a, "A5")))}` },
      { label: "Giorni di assenza per motivi familiari (ultimi 3 mesi, dichiarati)", value: dist(a, "A6", opt(SURVEY_A, "A6")) },
      { label: "Concentrazione sul lavoro (1-5)", value: `media ${r1(mean(valuesOf(a, "A7")))}` },
    ];
  }

  const both = [...C.keys()].filter((p) => A.has(p));
  const impact: ImpactBlock = { title: "Impatto a 90 giorni (survey C rispetto ad A)", n: both.length, suppressed: both.length < kMin, lines: [] };
  if (!impact.suppressed) {
    const delta = (aId: string, cId: string) => mean(both.map((p) => [A.get(p)![aId], C.get(p)![cId]]).filter(([x, y]) => x > 0 && y > 0).map(([x, y]) => y - x));
    const cs = both.map((p) => C.get(p)!);
    const c2 = valuesOf(cs, "C2");
    impact.lines = [
      { label: "Variazione difficoltà di conciliazione (negativo = meglio)", value: sign(delta("A1", "C1")) },
      { label: "Variazione supporto aziendale percepito", value: sign(delta("A3", "C3")) },
      { label: "Variazione benessere", value: sign(delta("A5", "C4")) },
      { label: "Variazione concentrazione", value: sign(delta("A7", "C5")) },
      { label: "Variazione fascia di assenze dichiarate (negativo = meno assenze)", value: sign(delta("A6", "C6")) },
      { label: "Intenzione di uscita a 90 giorni", value: `${pct(c2.filter((x) => x >= 4).length, c2.length)} «spesso» o «molto spesso»` },
      { label: "Impatto percepito sulla conciliazione (1-5)", value: `media ${r1(mean(valuesOf(cs, "C7")))}` },
      { label: "Misure aziendali usate dopo il percorso", value: SURVEY_C.questions.find((q) => q.id === "C8")!.options!.map((l, i) => `${l} ${pct(cs.filter((r) => r[`C8.${i + 1}`] === 1).length, cs.length)}`).join(" · ") },
      { label: "Permanenza in azienda a 24 mesi", value: dist(cs, "C9", opt(SURVEY_C, "C9")) },
    ];
  }
  return { baseline, impact };
}
