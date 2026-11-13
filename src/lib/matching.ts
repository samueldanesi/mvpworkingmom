import type { AppointmentSlot } from "./slots";
import { AREA_TO_SPECIALTIES } from "./constants";

/** U-06: regole configurabili (pesi) per il matching. */
export type MatchConfig = {
  weights: { area: number; language: number; gender: number; ageGroup: number; availability: number; coverage: number };
  top: number;
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: { area: 40, language: 15, gender: 10, ageGroup: 15, availability: 10, coverage: 10 },
  top: 3,
};

export type MatchPrefs = {
  area: string;
  /** Specializzazioni volute, ricavate dalle situazioni scelte nel questionario; se vuote si usa l'area. */
  wantedSpecialties?: string[];
  language: string; // es. "it"
  gender: "any" | "f" | "m";
  childAgeGroups: string[];
  coveredSpecialties: string[]; // della company; vuoto = tutte
};

export type Candidate = {
  userId: string;
  specializations: string[];
  languages: string[];
  gender: string | null;
  ageGroups: string[];
  nextSlot: Date | null;
  weeklyCapacityLeft: number;
};

export type Scored = { candidate: Candidate; score: number; reasons: string[] };

export function scoreCandidate(c: Candidate, p: MatchPrefs, cfg: MatchConfig = DEFAULT_MATCH_CONFIG, now = new Date()): Scored | null {
  if (c.weeklyCapacityLeft <= 0 && !c.nextSlot) return null;
  const w = cfg.weights;
  let score = 0;
  const reasons: string[] = [];
  const wanted = p.wantedSpecialties?.length ? p.wantedSpecialties : (AREA_TO_SPECIALTIES[p.area] ?? []);
  const areaHit = c.specializations.some((s) => wanted.includes(s));
  if (areaHit) {
    score += w.area;
    reasons.push("Specializzazione adatta alla tua area di bisogno");
  }
  if (c.languages.includes(p.language)) {
    score += w.language;
    if (p.language !== "it") reasons.push("Parla la tua lingua");
  }
  if (p.gender === "any" || c.gender === p.gender) {
    score += w.gender;
    if (p.gender !== "any") reasons.push("Corrisponde alla tua preferenza");
  }
  if (p.childAgeGroups.length === 0 || p.childAgeGroups.some((g) => c.ageGroups.includes(g))) {
    score += w.ageGroup;
    if (p.childAgeGroups.length) reasons.push("Segue l'età dei tuoi figli");
  }
  if (c.nextSlot) {
    const days = (c.nextSlot.getTime() - now.getTime()) / 86_400_000;
    const av = days <= 2 ? 1 : days <= 5 ? 0.6 : days <= 10 ? 0.3 : 0.1;
    score += w.availability * av;
    if (days <= 3) reasons.push("Disponibile a breve");
  }
  if (p.coveredSpecialties.length === 0 || c.specializations.some((s) => p.coveredSpecialties.includes(s))) {
    score += w.coverage;
  }
  return { candidate: c, score, reasons };
}

export function rank(cands: Candidate[], p: MatchPrefs, cfg: MatchConfig = DEFAULT_MATCH_CONFIG, now = new Date()): Scored[] {
  const scored = cands.map((c) => scoreCandidate(c, p, cfg, now)).filter((s): s is Scored => !!s);
  scored.sort((a, b) => b.score - a.score || (a.candidate.nextSlot?.getTime() ?? Infinity) - (b.candidate.nextSlot?.getTime() ?? Infinity));
  return scored;
}

export type { AppointmentSlot };
