import { NEED_AREAS } from "./constants";

/**
 * Logica pura degli indicatori (nessun accesso al DB): testabile e riutilizzabile.
 *
 * REGOLE DI ANONIMATO (D-05, P-04, scenario 8):
 *  - nessun dato per gruppi sotto N persone (K_MIN), per ogni filtro e ogni incrocio;
 *  - nelle ripartizioni, se una sola cella è soppressa si sopprime anche la più piccola
 *    delle altre (soppressione complementare), altrimenti si ricaverebbe per differenza.
 */

export type SubjectRow = {
  pseudonym: string;
  gender: string | null;
  area: string | null;
  site: string | null;
  firstPath: boolean | null;
  consentAggregate: boolean;
  registeredAt: Date;
};
export type EventRow = { pseudonym: string; type: string; occurredAt: Date; meta: Record<string, unknown> };
export type ResponseRow = { pseudonym: string; instrument: string; moment: string; score: number | null; answeredAt: Date };

export type Cell = { label: string; value: number | null; n: number; suppressed: boolean };
export type Kpi = {
  key: string;
  label: string;
  definition: string;
  unit: "%" | "punti" | "giorni" | "sedute" | "";
  value: number | null;
  n: number;
  suppressed: boolean;
  breakdown?: Cell[];
  note?: string;
};

export const DEFINITIONS_VERSION = "kpi-1.0";

export type KpiInput = {
  subjects: SubjectRow[]; // già filtrati per azienda, periodo e filtri HR
  events: EventRow[];
  responses: ResponseRow[];
  coveredEmployees: number;
  includedSessions: number;
  kMin: number;
};

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);

export function suppressCells(cells: Cell[], kMin: number): Cell[] {
  const out = cells.map((c) => (c.n < kMin ? { ...c, value: null, suppressed: true } : { ...c }));
  const sup = out.filter((c) => c.suppressed).length;
  if (sup === 1) {
    const open = out.filter((c) => !c.suppressed).sort((a, b) => a.n - b.n)[0];
    if (open) {
      open.value = null;
      open.suppressed = true;
    }
  }
  return out;
}

function deltas(subs: Set<string>, responses: ResponseRow[], instrument: string, later: string[]) {
  const byP = new Map<string, ResponseRow[]>();
  for (const r of responses) if (r.instrument === instrument && subs.has(r.pseudonym) && r.score !== null) (byP.get(r.pseudonym) ?? byP.set(r.pseudonym, []).get(r.pseudonym)!).push(r);
  const out: { p: string; delta: number }[] = [];
  for (const [p, rows] of byP) {
    const t0 = rows.find((r) => r.moment === "T0");
    const last = rows.filter((r) => later.includes(r.moment)).sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime())[0];
    if (t0 && last) out.push({ p, delta: (last.score as number) - (t0.score as number) });
  }
  return out;
}

export function computeKpis(inp: KpiInput): { kpis: Kpi[]; sampleSize: number; registered: number; belowThreshold: boolean } {
  const { kMin } = inp;
  const registered = inp.subjects.length;
  const cons = inp.subjects.filter((s) => s.consentAggregate);
  const consSet = new Set(cons.map((s) => s.pseudonym));
  const base = cons.length;
  const belowThreshold = base < kMin;

  const hide = (k: Omit<Kpi, "value" | "n" | "suppressed">, value: number | null, n: number, breakdown?: Cell[]): Kpi => {
    const sup = n < kMin || belowThreshold;
    return { ...k, value: sup ? null : round1(value), n: sup ? 0 : n, suppressed: sup, breakdown: sup ? undefined : breakdown ? suppressCells(breakdown, kMin) : undefined };
  };

  const ev = inp.events.filter((e) => consSet.has(e.pseudonym));
  const byType = (t: string) => new Set(ev.filter((e) => e.type === t).map((e) => e.pseudonym));
  const introDone = byType("intro_done");
  const sessionBooked = byType("session_booked");
  const changed = byType("specialist_changed");
  const kpis: Kpi[] = [];

  // K-01: usa tutti gli iscritti (dato di contratto), non solo chi ha dato il consenso aggregato
  const k01sup = registered < kMin || inp.coveredEmployees <= 0;
  kpis.push({
    key: "K-01",
    label: "Tasso di attivazione",
    definition: "Utenti registrati con il codice aziendale / dipendenti coperti dal programma.",
    unit: "%",
    value: k01sup ? null : round1((registered / inp.coveredEmployees) * 100),
    n: k01sup ? 0 : registered,
    suppressed: k01sup,
  });

  const conv = [...introDone].filter((p) => sessionBooked.has(p));
  kpis.push(hide({ key: "K-02", label: "Conversione dal colloquio", definition: "Utenti che prenotano una seduta dopo il colloquio gratuito / colloqui svolti.", unit: "%" }, introDone.size ? (conv.length / introDone.size) * 100 : null, introDone.size));

  const firstAppt: number[] = [];
  for (const s of cons) {
    const first = ev.filter((e) => e.pseudonym === s.pseudonym && e.type === "intro_booked").sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
    if (first) firstAppt.push((first.occurredAt.getTime() - s.registeredAt.getTime()) / 86_400_000);
  }
  kpis.push(hide({ key: "K-03", label: "Tempo al primo appuntamento", definition: "Giorni medi tra registrazione e prenotazione del primo colloquio.", unit: "giorni" }, mean(firstAppt), firstAppt.length));

  const done = ev.filter((e) => e.type === "session_done").length;
  const creditUsed = ev.filter((e) => e.type === "credit_used").length;
  kpis.push(hide({ key: "K-04", label: "Uso dei crediti", definition: "Sedute svolte medie per utente; il tasso di utilizzo dei crediti è crediti usati / crediti assegnati.", unit: "sedute", }, base ? done / base : null, base));
  const assigned = base * inp.includedSessions;
  kpis[kpis.length - 1].note = !kpis[kpis.length - 1].suppressed && assigned > 0 ? `Crediti usati: ${creditUsed} su ${assigned} assegnati (${Math.round((creditUsed / assigned) * 100)}%).` : undefined;

  const areaCells: Cell[] = Object.entries(
    cons.reduce<Record<string, number>>((m, s) => {
      const a = s.area ?? "n.d.";
      m[a] = (m[a] ?? 0) + 1;
      return m;
    }, {}),
  ).map(([key, n]) => ({ label: NEED_AREAS[key] ?? key, value: base ? Math.round((n / base) * 1000) / 10 : null, n, suppressed: false }));
  kpis.push(hide({ key: "K-05", label: "Aree tematiche", definition: "Distribuzione percentuale delle aree di bisogno dichiarate.", unit: "%" }, null, base, areaCells));

  const first = cons.filter((s) => s.firstPath).length;
  kpis.push(hide({ key: "K-06", label: "Primo percorso", definition: "Quota di utenti che non aveva mai fatto un percorso.", unit: "%" }, base ? (first / base) * 100 : null, base));

  const later = ["T1", "T2"];
  const d07 = deltas(consSet, inp.responses, "who5", later);
  kpis.push(hide({ key: "K-07", label: "Benessere (WHO-5)", definition: "Variazione media del punteggio (0-100) tra T0 e T1/T2. Positivo = miglioramento.", unit: "punti" }, mean(d07.map((d) => d.delta)), d07.length));
  const improved = d07.filter((d) => d.delta > 0).length;
  const k07 = kpis[kpis.length - 1];
  if (!k07.suppressed) k07.note = `Utenti con miglioramento: ${Math.round((improved / d07.length) * 100)}%.`;

  const d08 = deltas(consSet, inp.responses, "mental_load", later);
  kpis.push(hide({ key: "K-08", label: "Carico mentale", definition: "Variazione media dell'indice di carico mentale (0-100) tra T0 e T1/T2. Negativo = miglioramento.", unit: "punti", note: "Strumento in fase di validazione." }, mean(d08.map((d) => d.delta)), d08.length));
  const d09 = deltas(consSet, inp.responses, "care_load", later);
  kpis.push(hide({ key: "K-09", label: "Carico di cura", definition: "Variazione media dell'indice di carico di cura (0-100) tra T0 e T1/T2. Negativo = miglioramento.", unit: "punti", note: "Strumento in fase di validazione." }, mean(d09.map((d) => d.delta)), d09.length));
  const d10 = deltas(consSet, inp.responses, "wlc", ["T2"]);
  kpis.push(hide({ key: "K-10", label: "Conflitto vita-lavoro", definition: "Variazione media del conflitto percepito tra T0 e T2. Negativo = miglioramento.", unit: "punti", note: "Strumento in fase di validazione." }, mean(d10.map((d) => d.delta)), d10.length));

  const sat = inp.responses.filter((r) => r.instrument === "satisfaction" && consSet.has(r.pseudonym) && r.score !== null).map((r) => r.score as number);
  kpis.push(hide({ key: "K-11", label: "Soddisfazione", definition: "Soddisfazione media (0-100) del servizio e degli specialisti; propensione a raccomandare.", unit: "punti" }, mean(sat), sat.length));

  kpis.push(hide({ key: "K-12", label: "Cambio specialista", definition: "Quota di utenti che cambia specialista / colloqui svolti.", unit: "%" }, introDone.size ? (changed.size / introDone.size) * 100 : null, introDone.size));

  kpis.push({ key: "K-14", label: "Indagine aziendale", definition: "Quota di dipendenti che percepisce l'azienda come di supporto a genitorialità e cura, con confronto tra due rilevazioni.", unit: "%", value: null, n: 0, suppressed: true, note: "Non ancora disponibile in questa versione (priorità «Importante», B-10)." });

  // K-15: ripartizione per genere di K-01, K-04, K-08, K-09 — sempre con soglia per cella
  const genders = ["f", "m", "x"];
  const gLabel: Record<string, string> = { f: "Donne", m: "Uomini", x: "Altro" };
  const bySex = (g: string) => cons.filter((s) => s.gender === g);
  const cellsK01: Cell[] = genders.map((g) => ({ label: gLabel[g], value: inp.coveredEmployees ? null : null, n: inp.subjects.filter((s) => s.gender === g).length, suppressed: false })).filter((c) => c.n > 0);
  const regAll = inp.subjects.length || 1;
  cellsK01.forEach((c) => (c.value = Math.round((c.n / regAll) * 1000) / 10));
  const cellsK04: Cell[] = genders.map((g) => {
    const ps = new Set(bySex(g).map((s) => s.pseudonym));
    const sessions = ev.filter((e) => e.type === "session_done" && ps.has(e.pseudonym)).length;
    return { label: gLabel[g], value: ps.size ? Math.round((sessions / ps.size) * 10) / 10 : null, n: ps.size, suppressed: false };
  }).filter((c) => c.n > 0);
  const cellsDelta = (inst: string): Cell[] =>
    genders.map((g) => {
      const ps = new Set(bySex(g).map((s) => s.pseudonym));
      const d = deltas(ps, inp.responses, inst, later);
      return { label: gLabel[g], value: round1(mean(d.map((x) => x.delta))), n: d.length, suppressed: false };
    }).filter((c) => c.n > 0);
  const k15 = (key: string, label: string, cells: Cell[], unit: Kpi["unit"]): Kpi => {
    const sup = belowThreshold || cells.length === 0;
    return { key, label, definition: "Ripartizione per genere (auto-dichiarato), solo celle sopra la soglia di anonimato.", unit, value: null, n: cells.reduce((s, c) => s + c.n, 0), suppressed: sup, breakdown: sup ? undefined : suppressCells(cells, kMin) };
  };
  kpis.push(k15("K-15a", "Attivazione per genere (quota sugli iscritti)", cellsK01, "%"));
  kpis.push(k15("K-15b", "Uso per genere (sedute medie)", cellsK04, "sedute"));
  kpis.push(k15("K-15c", "Carico mentale per genere (variazione)", cellsDelta("mental_load"), "punti"));
  kpis.push(k15("K-15d", "Carico di cura per genere (variazione)", cellsDelta("care_load"), "punti"));

  return { kpis, sampleSize: base, registered, belowThreshold };
}
