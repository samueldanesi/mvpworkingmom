/**
 * D-02 / U-15 / B-10: survey fornite dalla Committente («Survey per i KPI aziendali», UNI/PdR 192:2026).
 *  - Survey A: baseline all'attivazione del percorso (momento T0, solo per chi ha un codice aziendale).
 *  - Survey C: follow-up a 90 giorni (momento T2, stessa condizione).
 *  - Survey E: rilevazione per tutto il personale (B-10 / K-14), anonima, tramite link.
 * Ogni risposta registra strumento e versione. Per cambiare una domanda: aggiornare qui e incrementare `version`.
 *
 * Codifica delle risposte (numeri, in `responses.items`):
 *  - scala e scelta singola: il numero scelto (1-5, oppure la posizione dell'opzione a partire da 1); 0 = «Preferisco non rispondere».
 *  - scelta multipla: una chiave `ID.n` = 1 per ogni opzione scelta (n parte da 1).
 */
export type SQ = {
  id: string;
  text: string;
  kind: "scale" | "single" | "multi";
  options?: string[];
  /** Estremi della scala 1-5. */
  lo?: string;
  hi?: string;
  /** Mostra «Preferisco non rispondere». */
  skip?: boolean;
  /** Numero massimo di scelte (multi). */
  max?: number;
};
export type Survey = { key: string; version: string; title: string; intro: string; questions: SQ[] };

const S = (id: string, text: string, lo = "Per niente", hi = "Moltissimo"): SQ => ({ id, text, kind: "scale", lo, hi, skip: true });
const FREQ = ["Mai", "Raramente", "A volte", "Spesso", "Molto spesso"];
const ABSENCE = ["0", "1-2", "3-5", "6-10", "Oltre 10"];

export const SURVEY_A: Survey = {
  key: "kpi_a",
  version: "A-1.0",
  title: "Il tuo punto di partenza sul lavoro",
  intro: "Circa 2 minuti. Fotografa la situazione prima del percorso: l'azienda vede solo numeri aggregati, mai le tue risposte.",
  questions: [
    S("A1", "Negli ultimi 30 giorni, quanto è stato difficile conciliare lavoro e impegni di cura?", "Per niente difficile", "Moltissimo"),
    { id: "A2", text: "Quanto spesso hai pensato di ridurre l'orario, cambiare lavoro o lasciarlo per motivi familiari?", kind: "single", options: FREQ },
    S("A3", "Quanto ti senti sostenuta/o dalla tua azienda nella gestione dei compiti familiari?"),
    { id: "A4", text: "Conosci le misure di conciliazione offerte dalla tua azienda?", kind: "single", options: ["Tutte", "Alcune", "Nessuna", "Non so"] },
    S("A5", "Come valuti il tuo benessere generale in questo periodo?", "Pessimo", "Ottimo"),
    { id: "A6", text: "Quanti giorni di assenza hai fatto negli ultimi 3 mesi per motivi familiari?", kind: "single", options: ABSENCE },
    S("A7", "Quanto riesci a concentrarti sul lavoro in questo periodo?"),
    { id: "A9", text: "Orario di lavoro (facoltativa)", kind: "single", options: ["Tempo pieno", "Part-time", "Altro"], skip: true },
    { id: "A10", text: "Modalità di lavoro prevalente (facoltativa)", kind: "single", options: ["In sede", "Ibrido", "Lavoro agile"], skip: true },
  ],
};

export const SURVEY_C: Survey = {
  key: "kpi_c",
  version: "C-1.0",
  title: "Come stai dopo il percorso",
  intro: "Circa 3 minuti. Ripetiamo alcune domande di inizio percorso per vedere cosa è cambiato. L'azienda vede solo medie aggregate.",
  questions: [
    S("C1", "Negli ultimi 30 giorni, quanto è stato difficile conciliare lavoro e impegni di cura?", "Per niente difficile", "Moltissimo"),
    { id: "C2", text: "Quanto spesso hai pensato di ridurre l'orario, cambiare lavoro o lasciarlo per motivi familiari?", kind: "single", options: FREQ },
    S("C3", "Quanto ti senti sostenuta/o dalla tua azienda nella gestione dei compiti familiari?"),
    S("C4", "Come valuti il tuo benessere generale in questo periodo?", "Pessimo", "Ottimo"),
    S("C5", "Quanto riesci a concentrarti sul lavoro in questo periodo?"),
    { id: "C6", text: "Quanti giorni di assenza hai fatto negli ultimi 3 mesi per motivi familiari?", kind: "single", options: ABSENCE },
    S("C7", "Quanto il percorso ha migliorato la tua capacità di conciliare lavoro e famiglia?"),
    { id: "C8", text: "Dopo il percorso hai usato una misura aziendale? (più risposte)", kind: "multi", options: ["Flessibilità oraria", "Lavoro agile", "Permessi", "Part-time", "Congedo", "Nessuna", "Non ce ne sono"] },
    { id: "C9", text: "Pensi di restare in azienda nei prossimi 24 mesi?", kind: "single", options: ["Sicuramente", "Probabilmente", "Non so", "Probabilmente no", "No"] },
  ],
};

/** Misure di conciliazione mostrate in E6/E7 (la Committente chiede di personalizzarle per azienda: qui l'elenco di base). */
export const DEFAULT_MEASURES = ["Flessibilità oraria", "Lavoro agile", "Part-time", "Congedi di maternità, paternità e parentali"];

export const SURVEY_E: Survey = {
  key: "company_survey",
  version: "E-1.0",
  title: "Indagine aziendale",
  intro: "Circa 8 minuti. È anonima: non chiediamo nome né email e l'azienda vede solo risultati aggregati.",
  questions: [
    { id: "E1", text: "Hai figli o persone di cui ti prendi cura?", kind: "single", options: ["Figli minori", "Altre persone", "Entrambi", "No"] },
    S("E2", "Quanto è difficile per te conciliare lavoro e vita familiare?", "Per niente difficile", "Moltissimo"),
    S("E3", "Nella mia azienda chi usa misure di conciliazione non viene penalizzato nella carriera.", "Per niente d'accordo", "Del tutto d'accordo"),
    S("E4", "Nella mia azienda uomini e donne hanno le stesse opportunità di crescita.", "Per niente d'accordo", "Del tutto d'accordo"),
    S("E5", "Il mio responsabile è disponibile quando ho esigenze familiari.", "Per niente d'accordo", "Del tutto d'accordo"),
    { id: "E6", text: "Quali misure di conciliazione conosci?", kind: "multi", options: DEFAULT_MEASURES },
    { id: "E7", text: "Quali misure hai usato negli ultimi 12 mesi?", kind: "multi", options: DEFAULT_MEASURES },
    S("E8", "Quanto sono utili per te le misure attuali?"),
    { id: "E9", text: "Di cosa avresti più bisogno? (massimo 3)", kind: "multi", max: 3, options: ["Flessibilità oraria", "Lavoro agile", "Supporto psicologico o familiare", "Servizi per l'infanzia", "Sostegno economico", "Formazione al rientro", "Congedi più lunghi", "Altro"] },
    { id: "E10", text: "Hai usato servizi di supporto alla genitorialità offerti dall'azienda (come Working Mom)?", kind: "single", options: ["Sì", "No", "Non li conosco"] },
    { id: "E11", text: "Fascia d'età (facoltativa)", kind: "single", options: ["Fino a 29 anni", "30-39", "40-49", "50-59", "60 e oltre"], skip: true },
  ],
};

/** K-14: quota di risposte 4-5 a questa domanda («Il mio responsabile è disponibile quando ho esigenze familiari»). */
export const K14_QUESTION = "E5";

/** Estrae le risposte di una survey da un FormData (campi `<prefix>.<ID>`); lancia errore se manca una risposta obbligatoria. */
export function parseSurvey(sv: Survey, get: (name: string) => string[], prefix = sv.key): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of sv.questions) {
    const raw = get(`${prefix}.${q.id}`);
    if (q.kind === "multi") {
      const picks = [...new Set(raw.map(Number))].filter((n) => Number.isInteger(n) && n >= 1 && n <= (q.options?.length ?? 0));
      if (picks.length === 0) throw new Error("Rispondi a tutte le domande.");
      if (q.max && picks.length > q.max) throw new Error(`Scegli al massimo ${q.max} risposte (${q.id}).`);
      for (const n of picks) out[`${q.id}.${n}`] = 1;
      continue;
    }
    const v = Number(raw[0]);
    const max = q.kind === "scale" ? 5 : (q.options?.length ?? 0);
    const min = q.skip ? 0 : 1;
    if (raw.length === 0 || !Number.isInteger(v) || v < min || v > max) throw new Error("Rispondi a tutte le domande.");
    out[q.id] = v;
  }
  return out;
}

/** Valori validi (>0) di una domanda a scala o scelta singola. */
export function valuesOf(rows: Record<string, number>[], id: string): number[] {
  return rows.map((r) => r[id]).filter((v): v is number => typeof v === "number" && v > 0);
}
export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
