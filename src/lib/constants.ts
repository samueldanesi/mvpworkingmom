export const SPECIALTIES: Record<string, string> = {
  psicologia: "Psicologia",
  perinatale: "Psicologia perinatale e maternità",
  coppia: "Coppia e co-genitorialità",
  logopedia: "Logopedia",
  sonno: "Consulenza del sonno",
  nutrizione: "Nutrizione",
  coaching: "Coaching e rientro al lavoro",
  psicologia_infantile: "Psicologia infantile e dell'età evolutiva",
  fisioterapia_pelvica: "Fisioterapia del pavimento pelvico",
  allattamento: "Consulenza allattamento (IBCLC)",
  ostetrica: "Ostetrica",
  puericultura: "Puericultrice e doula",
  spannolinamento: "Consulenza per lo spannolinamento",
  nutrizione_pediatrica: "Nutrizione pediatrica",
  psicomotricita: "Psicomotricità",
  neuropsichiatria: "Neuropsichiatria infantile",
  pedagogia: "Pedagogia e coaching genitoriale",
  dsa_bes: "Esperto DSA e BES",
  psicoterapia_familiare: "Psicoterapia familiare e di coppia",
  educazione: "Educatore professionale",
};

export const NEED_AREAS: Record<string, string> = {
  sonno: "Sonno",
  linguaggio: "Linguaggio e sviluppo",
  alimentazione: "Alimentazione",
  rientro: "Rientro al lavoro dopo la maternità",
  carico_mentale: "Carico mentale",
  coppia: "Coppia e co-genitorialità",
  perinatale: "Gravidanza, parto e post-parto",
  sviluppo: "Sviluppo del bambino",
  emotivo: "Emozioni del bambino",
  educazione: "Educazione e scuola",
  altro: "Altro / non so ancora",
};

/** Mappa area di bisogno -> specialità che la coprono (usata dal matching). */
export const AREA_TO_SPECIALTIES: Record<string, string[]> = {
  sonno: ["sonno", "perinatale"],
  linguaggio: ["logopedia"],
  alimentazione: ["nutrizione"],
  rientro: ["coaching", "psicologia"],
  carico_mentale: ["psicologia", "perinatale", "coaching"],
  coppia: ["coppia", "psicologia"],
  altro: ["psicologia", "perinatale"],
};

export const AGE_GROUPS: Record<string, string> = {
  "0-2": "0-2 anni",
  "3-5": "3-5 anni",
  "6-11": "6-11 anni",
  "12-17": "12-17 anni",
};

export const LANGUAGES: Record<string, string> = { it: "Italiano", en: "Inglese", es: "Spagnolo", fr: "Francese", de: "Tedesco" };

export const PIPELINE_STAGES = ["contatto", "demo", "proposta", "contratto", "lancio", "attivo", "rinnovo"];

/** Versioni dei documenti per la tracciatura dei consensi (P-01, S-02). */
export const DOC_VERSIONS = {
  health_data: "2026-11-v1",
  aggregate_use: "2026-11-v1",
  terms: "2026-11-v1",
  privacy: "2026-11-v1",
  specialist_contract: "2026-11-v1",
  code_of_conduct: "2026-11-v1",
} as const;

export const EMERGENCY_NUMBERS = [
  { label: "Emergenza sanitaria", number: "112" },
  { label: "Telefono Amico Italia", number: "02 2327 2327" },
  { label: "Telefono Azzurro (minori)", number: "19696" },
  { label: "Antiviolenza e stalking", number: "1522" },
];

/* ── U-04: questionario d'ingresso (testi forniti dalla Committente) ── */
export const INTAKE_PATHS: Record<string, { title: string; text: string }> = {
  me: { title: "Per me", text: "Uno spazio tutto tuo per affrontare gravidanza, post-parto, identità e carico mentale." },
  bambino: { title: "Per il mio bambino", text: "Uno spazio per capire come sta crescendo e come accompagnarlo, coinvolgendo te." },
  famiglia: { title: "Per la nostra famiglia", text: "Uno spazio per ritrovare equilibrio come coppia e come famiglia." },
};

/** Fase di vita -> fasce d'età usate dal matching e dall'archivio analitico. */
export const INTAKE_STAGES: Record<string, { label: string; ageGroups: string[] }> = {
  attesa: { label: "Sto aspettando un bambino", ageGroups: [] },
  neonato: { label: "Ho un neonato (0-12 mesi)", ageGroups: ["0-2"] },
  "1-3": { label: "Ho un bambino da 1 a 3 anni", ageGroups: ["0-2", "3-5"] },
  "3-6": { label: "Ho un bambino da 3 a 6 anni", ageGroups: ["3-5", "6-11"] },
  "6+": { label: "Ho un bambino da 6 anni in su", ageGroups: ["6-11", "12-17"] },
};

export type Situation = { id: string; group: string; text: string; third?: string; area: string; specialties: string[]; note?: string };
export const SITUATION_GROUPS = ["Gravidanza, parto e post-parto", "Salute del bambino", "Psicologia ed educazione"] as const;

/** Ogni situazione indica l'area tematica (K-05) e le specializzazioni da proporre (regole di abbinamento della Committente). */
export const SITUATIONS: Situation[] = [
  { id: "parto_prep", group: SITUATION_GROUPS[0], text: "Mi sto preparando al parto o ho dubbi sulla gravidanza", area: "perinatale", specialties: ["ostetrica", "perinatale"] },
  { id: "parto_difficile", group: SITUATION_GROUPS[0], text: "Ho vissuto un parto difficile e faccio fatica a elaborarlo", area: "perinatale", specialties: ["perinatale"] },
  { id: "post_triste", group: SITUATION_GROUPS[0], text: "Dopo la nascita mi sento triste o sopraffatta", area: "perinatale", specialties: ["perinatale"] },
  { id: "post_dolore", group: SITUATION_GROUPS[0], text: "Ho dolore o fastidi dopo il parto", area: "perinatale", specialties: ["fisioterapia_pelvica"], note: "Per dolore o fastidi dopo il parto consulta anche il tuo medico o la tua ostetrica: questo percorso non sostituisce una visita." },
  { id: "allattamento", group: SITUATION_GROUPS[0], text: "Ho difficoltà con l'allattamento", area: "perinatale", specialties: ["allattamento", "ostetrica"] },
  { id: "sostegno_pratico", group: SITUATION_GROUPS[0], text: "Vorrei un sostegno pratico nei primi mesi", area: "perinatale", specialties: ["puericultura"] },
  { id: "pannolino", group: SITUATION_GROUPS[0], text: "Vorrei togliere il pannolino", third: "Vorremmo togliere il pannolino a nostro figlio", area: "sviluppo", specialties: ["spannolinamento"] },
  { id: "sonno", group: SITUATION_GROUPS[1], text: "Mio figlio dorme poco o si sveglia spesso", third: "Il bambino dorme poco o si sveglia spesso", area: "sonno", specialties: ["sonno"] },
  { id: "svezzamento", group: SITUATION_GROUPS[1], text: "Ho dubbi su svezzamento e alimentazione", third: "Ci sono dubbi su svezzamento e alimentazione", area: "alimentazione", specialties: ["nutrizione_pediatrica", "nutrizione"] },
  { id: "linguaggio", group: SITUATION_GROUPS[1], text: "Mio figlio fatica a parlare o a farsi capire", third: "Il bambino fatica a parlare o a farsi capire", area: "linguaggio", specialties: ["logopedia"] },
  { id: "movimento", group: SITUATION_GROUPS[1], text: "Ha difficoltà di movimento, coordinazione o gioco", third: "Ha difficoltà di movimento, coordinazione o gioco", area: "sviluppo", specialties: ["psicomotricita"] },
  { id: "sviluppo", group: SITUATION_GROUPS[1], text: "Mi preoccupa il suo sviluppo, l'attenzione o il comportamento", third: "Preoccupano lo sviluppo, l'attenzione o il comportamento", area: "sviluppo", specialties: ["neuropsichiatria"] },
  { id: "paure", group: SITUATION_GROUPS[1], text: "Mio figlio ha paure, ansie o è spesso triste", third: "Il bambino ha paure, ansie o è spesso triste", area: "emotivo", specialties: ["psicologia_infantile"] },
  { id: "capricci", group: SITUATION_GROUPS[2], text: "Capricci, rabbia e regole sono diventati una fatica quotidiana", third: "Capricci, rabbia e regole sono diventati una fatica quotidiana", area: "educazione", specialties: ["pedagogia", "psicologia_infantile"] },
  { id: "scuola", group: SITUATION_GROUPS[2], text: "Ho difficoltà a scuola o nell'apprendimento", third: "Il bambino ha difficoltà a scuola o nell'apprendimento", area: "educazione", specialties: ["dsa_bes", "neuropsichiatria"] },
  { id: "coppia", group: SITUATION_GROUPS[2], text: "Ci sono tensioni nella coppia o in famiglia", area: "coppia", specialties: ["psicoterapia_familiare", "coppia"] },
  { id: "carico_mentale", group: SITUATION_GROUPS[2], text: "Mi sento schiacciata dal carico mentale e dal senso di colpa", third: "Mi sento schiacciata dal carico mentale e dal senso di colpa", area: "carico_mentale", specialties: ["psicologia", "perinatale"] },
  { id: "identita", group: SITUATION_GROUPS[2], text: "Faccio fatica a conciliare identità professionale e maternità", third: "Faccio fatica a conciliare identità professionale e maternità", area: "rientro", specialties: ["coaching", "psicologia"] },
  { id: "confronto", group: SITUATION_GROUPS[2], text: "Vorrei solo un confronto educativo", third: "Vorrei solo un confronto educativo", area: "educazione", specialties: ["educazione", "pedagogia"] },
];

export function situationSpecialties(ids: string[]): string[] {
  return [...new Set(SITUATIONS.filter((s) => ids.includes(s.id)).flatMap((s) => s.specialties))];
}
