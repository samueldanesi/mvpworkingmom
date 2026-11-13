import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { decryptJson, decryptText, encryptJson, encryptText } from "../crypto";
import { base32Decode, base32Encode, hotp, verifyTotp, totp } from "../totp";
import { generateSlots } from "../slots";
import { computeKpis, suppressCells, type EventRow, type ResponseRow, type SubjectRow } from "../kpi-core";
import { splitAmount } from "../payments";
import { rank, type Candidate } from "../matching";
import { detectAlarm } from "../safety";
import { scoreQuestionnaire, QUESTIONNAIRES } from "../questionnaires";
import { buildIcs } from "../ics";
import { situationSpecialties } from "../constants";
import { parseSurvey, SURVEY_A, SURVEY_E } from "../survey-library";

describe("cifratura (P-05)", () => {
  it("round trip e cifratura non deterministica", () => {
    const a = encryptText("dato sulla salute");
    const b = encryptText("dato sulla salute");
    expect(a).not.toEqual(b);
    expect(a.startsWith("v1:")).toBe(true);
    expect(decryptText(a)).toBe("dato sulla salute");
    expect(decryptJson<{ x: number }>(encryptJson({ x: 1 })).x).toBe(1);
  });
  it("rileva manomissione", () => {
    const enc = encryptText("ciao");
    const tampered = enc.slice(0, -3) + (enc.endsWith("AAA") ? "BBB" : "AAA");
    expect(() => decryptText(tampered)).toThrow();
  });
});

describe("TOTP (P-06)", () => {
  it("vettori RFC 4226", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(hotp(secret, 0)).toBe("755224");
    expect(hotp(secret, 1)).toBe("287082");
    expect(hotp(secret, 9)).toBe("520489");
  });
  it("base32 round trip e verifica con finestra", () => {
    const s = "JBSWY3DPEHPK3PXP";
    expect(base32Encode(base32Decode(s))).toBe(s);
    const t = Date.UTC(2026, 10, 5, 12, 0, 0);
    expect(verifyTotp(s, totp(s, t), t)).toBe(true);
    expect(verifyTotp(s, totp(s, t - 30_000), t)).toBe(true);
    expect(verifyTotp(s, totp(s, t - 120_000), t)).toBe(false);
    expect(verifyTotp(s, "abc", t)).toBe(false);
  });
});

describe("slot reali (U-08, S-04)", () => {
  const base = {
    tz: "Europe/Rome",
    durationMin: 50,
    kind: "session" as const,
    days: 7,
    now: new Date("2026-11-06T10:00:00Z"), // venerdì prima
    from: new Date("2026-11-09T00:00:00Z"), // lunedì
    busy: [] as { startsAt: Date; endsAt: Date }[],
  };
  const rules = [{ weekday: 1, startMin: 9 * 60, endMin: 13 * 60, kind: "session" as const }];
  it("genera slot nel fuso del professionista", () => {
    const s = generateSlots({ ...base, rules });
    expect(s.length).toBe(4); // 9,10,11,12
    expect(DateTime.fromJSDate(s[0].startsAt).setZone("Europe/Rome").toFormat("HH:mm")).toBe("09:00");
  });
  it("toglie slot occupati, giorni liberi e rispetta il preavviso", () => {
    const first = generateSlots({ ...base, rules })[0];
    const withBusy = generateSlots({ ...base, rules, busy: [first] });
    expect(withBusy.some((x) => x.startsAt.getTime() === first.startsAt.getTime())).toBe(false);
    expect(generateSlots({ ...base, rules, offDays: ["2026-11-09"] }).length).toBe(0);
    expect(generateSlots({ ...base, rules, now: new Date("2026-11-09T08:30:00Z"), leadHours: 6 }).length).toBe(0);
  });
  it("rispetta la capacità settimanale", () => {
    expect(generateSlots({ ...base, rules, weeklyCapacity: 2, weeklyBooked: { "2026-W46": 2 } }).length).toBe(0);
  });
  it("gestisce il cambio ora legale senza slittamenti", () => {
    const r = [{ weekday: 1, startMin: 9 * 60, endMin: 10 * 60, kind: "session" as const }];
    const s = generateSlots({ ...base, rules: r, from: new Date("2026-10-25T00:00:00Z"), now: new Date("2026-10-20T00:00:00Z"), days: 10 });
    const hours = s.map((x) => DateTime.fromJSDate(x.startsAt).setZone("Europe/Rome").toFormat("HH:mm"));
    expect(new Set(hours)).toEqual(new Set(["09:00"]));
  });
  it("separa slot di colloquio e di seduta", () => {
    const mixed = [...rules, { weekday: 1, startMin: 14 * 60, endMin: 15 * 60, kind: "intro" as const }];
    expect(generateSlots({ ...base, rules: mixed, kind: "intro", durationMin: 20 }).length).toBe(2);
  });
});

describe("anonimato dei report (D-05, P-04, scenario 8)", () => {
  const mkSubjects = (n: number, gender: (i: number) => string): SubjectRow[] =>
    Array.from({ length: n }, (_, i) => ({ pseudonym: `p${i}`, gender: gender(i), area: "sonno", site: "Roma", firstPath: true, consentAggregate: true, registeredAt: new Date("2026-09-01") }));
  const events = (subs: SubjectRow[]): EventRow[] => subs.flatMap((s) => [{ pseudonym: s.pseudonym, type: "intro_done", occurredAt: new Date("2026-09-10"), meta: {} }, { pseudonym: s.pseudonym, type: "session_booked", occurredAt: new Date("2026-09-11"), meta: {} }]);
  const resp = (subs: SubjectRow[]): ResponseRow[] => subs.flatMap((s) => [
    { pseudonym: s.pseudonym, instrument: "who5", moment: "T0", score: 40, answeredAt: new Date("2026-09-01") },
    { pseudonym: s.pseudonym, instrument: "who5", moment: "T1", score: 60, answeredAt: new Date("2026-10-01") },
  ]);
  const run = (subs: SubjectRow[], kMin = 10) => computeKpis({ subjects: subs, events: events(subs), responses: resp(subs), coveredEmployees: 100, includedSessions: 3, kMin });

  it("sotto soglia nessun indicatore mostra valori", () => {
    const r = run(mkSubjects(9, () => "f"));
    expect(r.belowThreshold).toBe(true);
    for (const k of r.kpis) {
      expect(k.value).toBeNull();
      expect(k.breakdown).toBeUndefined();
    }
  });
  it("sopra soglia mostra valori corretti", () => {
    const r = run(mkSubjects(12, () => "f"));
    const k07 = r.kpis.find((k) => k.key === "K-07")!;
    expect(k07.suppressed).toBe(false);
    expect(k07.value).toBe(20);
    expect(r.kpis.find((k) => k.key === "K-02")!.value).toBe(100);
    expect(r.kpis.find((k) => k.key === "K-01")!.value).toBe(12);
  });
  it("sopprime le celle piccole e applica la soppressione complementare", () => {
    const subs = mkSubjects(14, (i) => (i < 11 ? "f" : i < 13 ? "m" : "x"));
    const r = run(subs);
    const k = r.kpis.find((x) => x.key === "K-15b")!;
    const cells = k.breakdown ?? [];
    const visible = cells.filter((c) => !c.suppressed);
    // m (2) e x (1) sotto soglia: restano soppresse; f (11) visibile ma con 2 celle soppresse non serve altro
    expect(cells.find((c) => c.label === "Uomini")?.suppressed).toBe(true);
    expect(cells.find((c) => c.label === "Altro")?.suppressed).toBe(true);
    expect(visible.length).toBeLessThanOrEqual(1);
  });
  it("una sola cella soppressa => sopprime anche la più piccola delle altre", () => {
    const out = suppressCells([{ label: "a", value: 1, n: 30, suppressed: false }, { label: "b", value: 2, n: 12, suppressed: false }, { label: "c", value: 3, n: 4, suppressed: false }], 10);
    expect(out.find((c) => c.label === "c")?.suppressed).toBe(true);
    expect(out.find((c) => c.label === "b")?.suppressed).toBe(true);
    expect(out.find((c) => c.label === "a")?.suppressed).toBe(false);
  });
  it("chi non ha dato il consenso non entra negli esiti", () => {
    const subs = mkSubjects(12, () => "f").map((s, i) => ({ ...s, consentAggregate: i < 8 }));
    const r = run(subs);
    expect(r.belowThreshold).toBe(true);
  });
});

describe("pagamenti (scenario 11)", () => {
  it("commissione e netto sono interi e sommano all'importo", () => {
    for (const amount of [4900, 5900, 1, 3333, 12345]) {
      const s = splitAmount(amount, 30);
      expect(Number.isInteger(s.feeCents)).toBe(true);
      expect(s.feeCents + s.specialistNetCents).toBe(amount);
    }
    expect(splitAmount(4900, 30)).toEqual({ feeCents: 1470, specialistNetCents: 3430 });
  });
  it("rimborso parziale: il netto si ricalcola sul residuo", () => {
    const afterRefund = splitAmount(4900 - 1000, 30);
    expect(afterRefund.specialistNetCents).toBe(2730);
  });
});

describe("matching (U-06)", () => {
  const mk = (id: string, over: Partial<Candidate> = {}): Candidate => ({ userId: id, specializations: ["psicologia"], languages: ["it"], gender: "f", ageGroups: ["3-5"], nextSlot: new Date(Date.now() + 86_400_000), weeklyCapacityLeft: 5, ...over });
  it("privilegia area, lingua e fascia d'età", () => {
    const r = rank([mk("a", { specializations: ["logopedia"] }), mk("b", { specializations: ["sonno"], languages: ["it", "en"], ageGroups: ["0-2"] }), mk("c", { specializations: ["sonno"], ageGroups: ["3-5"] })], { area: "sonno", language: "it", gender: "any", childAgeGroups: ["3-5"], coveredSpecialties: [] });
    expect(r[0].candidate.userId).toBe("c");
    expect(r.map((x) => x.candidate.userId)).toContain("a");
  });
});

describe("sicurezza (U-05)", () => {
  it("riconosce parole di allarme", () => {
    expect(detectAlarm("a volte penso di farla finita")).not.toBeNull();
    expect(detectAlarm("ho paura che mio marito mi picchia")).not.toBeNull();
    expect(detectAlarm("sono molto stanca e dormo poco")).toBeNull();
  });
});

describe("questionari e calendario", () => {
  it("punteggio normalizzato 0-100", () => {
    const q = QUESTIONNAIRES.who5;
    expect(scoreQuestionnaire(q, { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5 })).toBe(100);
    expect(scoreQuestionnaire(q, { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 })).toBe(0);
    expect(scoreQuestionnaire(q, { q1: 5 })).toBeNull();
  });
  it("genera un .ics valido", () => {
    const ics = buildIcs({ id: "x", title: "Seduta; test", start: new Date("2026-11-10T09:00:00Z"), end: new Date("2026-11-10T09:50:00Z") });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261110T090000Z");
    expect(ics).toContain("SUMMARY:Seduta\; test");
  });
});

describe("questionario d'ingresso e survey della Committente", () => {
  it("le situazioni scelte danno le specializzazioni giuste (regole di abbinamento)", () => {
    expect(situationSpecialties(["parto_difficile"])).toEqual(["perinatale"]);
    expect(situationSpecialties(["allattamento"])).toEqual(expect.arrayContaining(["allattamento", "ostetrica"]));
    expect(situationSpecialties(["linguaggio", "sonno"])).toEqual(expect.arrayContaining(["logopedia", "sonno"]));
    expect(situationSpecialties([])).toEqual([]);
  });
  it("il matching usa le specializzazioni delle situazioni", () => {
    const mk = (id: string, sp: string[]): Candidate => ({ userId: id, specializations: sp, languages: ["it"], gender: "f", ageGroups: ["0-2"], nextSlot: new Date(Date.now() + 86_400_000), weeklyCapacityLeft: 5 });
    const r = rank([mk("x", ["psicologia"]), mk("ibclc", ["allattamento"])], { area: "perinatale", wantedSpecialties: situationSpecialties(["allattamento"]), language: "it", gender: "any", childAgeGroups: [], coveredSpecialties: [] });
    expect(r[0].candidate.userId).toBe("ibclc");
  });
  it("survey A: accetta «preferisco non rispondere» solo dove previsto e rifiuta risposte mancanti", () => {
    const base: Record<string, string[]> = { "kpi_a.A1": ["3"], "kpi_a.A2": ["2"], "kpi_a.A3": ["0"], "kpi_a.A4": ["1"], "kpi_a.A5": ["4"], "kpi_a.A6": ["1"], "kpi_a.A7": ["5"], "kpi_a.A9": ["0"], "kpi_a.A10": ["2"] };
    const ok = parseSurvey(SURVEY_A, (n) => base[n] ?? []);
    expect(ok.A3).toBe(0);
    expect(ok.A1).toBe(3);
    expect(() => parseSurvey(SURVEY_A, (n) => (n === "kpi_a.A1" ? [] : base[n] ?? []))).toThrow();
    expect(() => parseSurvey(SURVEY_A, (n) => (n === "kpi_a.A2" ? ["9"] : base[n] ?? []))).toThrow();
  });
  it("survey E: scelta multipla con massimo 3 risposte (E9)", () => {
    const base: Record<string, string[]> = { "company_survey.E1": ["1"], "company_survey.E2": ["3"], "company_survey.E3": ["4"], "company_survey.E4": ["4"], "company_survey.E5": ["5"], "company_survey.E6": ["1", "2"], "company_survey.E7": ["1"], "company_survey.E8": ["3"], "company_survey.E9": ["1", "2", "3"], "company_survey.E10": ["2"], "company_survey.E11": ["0"] };
    expect(parseSurvey(SURVEY_E, (n) => base[n] ?? [])["E9.3"]).toBe(1);
    expect(() => parseSurvey(SURVEY_E, (n) => (n === "company_survey.E9" ? ["1", "2", "3", "4"] : base[n] ?? []))).toThrow();
  });
});
