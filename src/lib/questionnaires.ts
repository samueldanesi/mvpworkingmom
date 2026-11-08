/**
 * D-02: libreria questionari versionata. Ogni risposta registra strumento e versione.
 *
 * ATTENZIONE (D-04): gli strumenti sono ancora da scegliere con lo psicologo del lavoro.
 *  - WHO-5 è uno strumento pubblico e validato (candidato noto nell'Allegato A).
 *  - Carico mentale, carico di cura e conflitto lavoro-famiglia sono BOZZE: le domande vanno
 *    sostituite con quelle validate dalla Committente. La struttura (scale, punteggio, versione)
 *    non cambia: si aggiorna solo questo file e si incrementa `version`.
 */
export type Scale = { min: number; max: number; labels: string[] };
export type Questionnaire = {
  key: string;
  version: string;
  title: string;
  intro: string;
  draft: boolean;
  scale: Scale;
  items: { id: string; text: string; reverse?: boolean }[];
  /** "higher_better": punteggio alto = meglio (benessere). "higher_worse": punteggio alto = carico maggiore. */
  direction: "higher_better" | "higher_worse";
};

const freq5: Scale = { min: 0, max: 5, labels: ["Mai", "Raramente", "Meno della metà del tempo", "Più della metà del tempo", "Quasi sempre", "Sempre"] };
const agree5: Scale = { min: 1, max: 5, labels: ["Per niente", "Poco", "Abbastanza", "Molto", "Moltissimo"] };

export const QUESTIONNAIRES: Record<string, Questionnaire> = {
  who5: {
    key: "who5",
    version: "who5-1.0",
    title: "Benessere (WHO-5)",
    intro: "Nelle ultime due settimane…",
    draft: false,
    scale: freq5,
    direction: "higher_better",
    items: [
      { id: "q1", text: "Mi sono sentito/a allegro/a e di buon umore" },
      { id: "q2", text: "Mi sono sentito/a calmo/a e rilassato/a" },
      { id: "q3", text: "Mi sono sentito/a attivo/a e pieno/a di energia" },
      { id: "q4", text: "Mi sono svegliato/a sentendomi fresco/a e riposato/a" },
      { id: "q5", text: "La mia vita quotidiana è stata piena di cose che mi interessano" },
    ],
  },
  mental_load: {
    key: "mental_load",
    version: "ml-draft-0.1",
    title: "Carico mentale",
    intro: "BOZZA da validare. Nell'ultimo mese, quanto ti sei riconosciuto/a in queste frasi?",
    draft: true,
    scale: agree5,
    direction: "higher_worse",
    items: [
      { id: "q1", text: "Devo ricordarmi io di quasi tutto ciò che riguarda la famiglia" },
      { id: "q2", text: "Anche quando non lavoro, ho la testa piena di cose da organizzare" },
      { id: "q3", text: "Faccio fatica a staccare dai pensieri su casa, figli e lavoro" },
      { id: "q4", text: "Mi sento la persona che \"tiene insieme\" tutto" },
      { id: "q5", text: "Pianificare la settimana mi stanca più del farla" },
      { id: "q6", text: "Ho la sensazione di non avere mai un momento davvero libero" },
    ],
  },
  care_load: {
    key: "care_load",
    version: "cl-draft-0.1",
    title: "Carico di cura",
    intro: "BOZZA da validare. Nell'ultimo mese, quanto ti sei riconosciuto/a in queste frasi?",
    draft: true,
    scale: agree5,
    direction: "higher_worse",
    items: [
      { id: "q1", text: "Il tempo che dedico alla cura di figli o familiari mi lascia poco per me" },
      { id: "q2", text: "Mi sento esausto/a per le responsabilità di cura" },
      { id: "q3", text: "Ricevo poco aiuto concreto nella gestione quotidiana", },
      { id: "q4", text: "Sento di non avere abbastanza supporto da chi mi sta vicino" },
      { id: "q5", text: "Le esigenze di cura mi costringono a rinunciare a cose importanti" },
      { id: "q6", text: "Mi sento in colpa quando penso ai miei bisogni" },
    ],
  },
  wlc: {
    key: "wlc",
    version: "wlc-draft-0.1",
    title: "Conciliazione vita-lavoro",
    intro: "BOZZA da validare. Nell'ultimo mese…",
    draft: true,
    scale: agree5,
    direction: "higher_worse",
    items: [
      { id: "q1", text: "Gli impegni di lavoro mi impediscono di dedicare il tempo che vorrei alla famiglia" },
      { id: "q2", text: "Gli impegni familiari mi impediscono di rendere al lavoro come vorrei" },
      { id: "q3", text: "Arrivo al lavoro già stanco/a per gli impegni di casa" },
      { id: "q4", text: "Arrivo a casa troppo stanco/a dal lavoro per dedicarmi alla famiglia" },
    ],
  },
  satisfaction: {
    key: "satisfaction",
    version: "sat-1.0",
    title: "Soddisfazione",
    intro: "Com'è andata finora?",
    draft: false,
    scale: agree5,
    direction: "higher_better",
    items: [
      { id: "q1", text: "Sono soddisfatto/a del servizio nel suo complesso" },
      { id: "q2", text: "Mi trovo bene con il mio specialista" },
      { id: "q3", text: "Consiglierei Working Mom a un/una collega" },
    ],
  },
};

/** I check-in usano questi strumenti; "satisfaction" solo da T1 in poi. */
export const CHECKIN_SET: Record<"T0" | "T1" | "T2", string[]> = {
  T0: ["who5", "mental_load", "care_load", "wlc"],
  T1: ["who5", "mental_load", "care_load", "satisfaction"],
  T2: ["who5", "mental_load", "care_load", "wlc", "satisfaction"],
};

/** Punteggio normalizzato 0-100 (media degli item, riscalata sull'intervallo della scala). */
export function scoreQuestionnaire(q: Questionnaire, answers: Record<string, number>): number | null {
  const vals: number[] = [];
  for (const it of q.items) {
    const v = answers[it.id];
    if (typeof v !== "number" || Number.isNaN(v)) return null;
    const c = Math.min(q.scale.max, Math.max(q.scale.min, v));
    vals.push(it.reverse ? q.scale.max + q.scale.min - c : c);
  }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(((mean - q.scale.min) / (q.scale.max - q.scale.min)) * 1000) / 10;
}

/** N-esima seduta in cui chiedere il check-in T1 (Allegato A: "dopo la quarta seduta"). */
export const T1_AFTER_SESSIONS = 4;
