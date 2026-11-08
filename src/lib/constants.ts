export const SPECIALTIES: Record<string, string> = {
  psicologia: "Psicologia",
  perinatale: "Psicologia perinatale e maternità",
  coppia: "Coppia e co-genitorialità",
  logopedia: "Logopedia",
  sonno: "Consulenza del sonno",
  nutrizione: "Nutrizione",
  coaching: "Coaching e rientro al lavoro",
};

export const NEED_AREAS: Record<string, string> = {
  sonno: "Sonno",
  linguaggio: "Linguaggio e sviluppo",
  alimentazione: "Alimentazione",
  rientro: "Rientro al lavoro dopo la maternità",
  carico_mentale: "Carico mentale",
  coppia: "Coppia e co-genitorialità",
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
