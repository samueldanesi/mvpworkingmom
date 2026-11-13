/**
 * Dati DIMOSTRATIVI per sviluppo e collaudo. Mai da eseguire in produzione.
 * Tutte le password sono "Demo-Password-1"; il 2FA del personale usa il segreto di prova DEMO_TOTP.
 */
import "./loadenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import {
  accessCodes,
  appointments,
  availabilityRules,
  careRelationships,
  companies,
  companySurveys,
  trainingEvents,
  consents,
  creditLedger,
  db,
  events,
  intakeProfiles,
  messages,
  payments,
  pseudonymMap,
  ratings,
  responses,
  specialistProfiles,
  subjects,
  threads,
  users,
  sqlClient,
} from "./index";
import { encryptText, encryptJson, newPseudonym } from "../lib/crypto";
import { scoreQuestionnaire, QUESTIONNAIRES } from "../lib/questionnaires";
import { DOC_VERSIONS } from "../lib/constants";

if (process.env.NODE_ENV === "production") throw new Error("Seed vietato in produzione");

const PASSWORD = "Demo-Password-1";
export const DEMO_TOTP = "JBSWY3DPEHPK3PXP";

// generatore pseudo-casuale deterministico
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const verified = now;

  const mk = async (email: string, fullName: string, role: "user" | "specialist" | "hr" | "admin" | "clinical_lead", extra: Partial<typeof users.$inferInsert> = {}) => {
    const needs2fa = ["specialist", "admin", "clinical_lead"].includes(role);
    const [u] = await db
      .insert(users)
      .values({ email, fullName, role, passwordHash: hash, emailVerifiedAt: verified, totpEnabled: needs2fa, totpSecretEnc: needs2fa ? encryptText(DEMO_TOTP) : null, ...extra })
      .returning();
    return u;
  };

  /* aziende */
  const [acme] = await db
    .insert(companies)
    .values({
      name: "Acme S.p.A.", slug: "acme", vatNumber: "IT01234567890", sdiCode: "ABCDEFG", pec: "acme@pec.test", coveredEmployees: 120, includedSessions: 3, discountPct: 20,
      familyMax: 2, familyDiscountPct: 15, allowedDomains: ["acme.test"], allowPersonalEmail: false, annualFeeCents: 3_600_000, contractValueCents: 3_600_000,
      startsAt: DateTime.now().minus({ months: 3 }).toJSDate(), endsAt: DateTime.now().plus({ months: 9 }).toJSDate(), pipelineStage: "attivo", accountOwner: "Chiara Montaldi",
    })
    .returning();
  const [beta] = await db
    .insert(companies)
    .values({ name: "Beta S.r.l.", slug: "beta", coveredEmployees: 40, includedSessions: 5, discountPct: 10, allowedDomains: ["beta.test"], pipelineStage: "lancio", startsAt: DateTime.now().minus({ months: 1 }).toJSDate(), endsAt: DateTime.now().plus({ months: 11 }).toJSDate() })
    .returning();
  await db.insert(accessCodes).values([
    { companyId: acme.id, code: "ACME2026", kind: "shared" },
    { companyId: beta.id, code: "BETA2026", kind: "shared" },
    { companyId: acme.id, code: "SCADUTO1", kind: "shared", expiresAt: DateTime.now().minus({ days: 3 }).toJSDate() },
    { companyId: acme.id, code: "REVOCATO", kind: "shared", revokedAt: new Date() },
    { companyId: acme.id, code: "MONO0001", kind: "single", maxUses: 1 },
  ]);

  /* staff */
  await mk("admin@workingmom.test", "Admin Working Mom", "admin");
  await mk("clinica@workingmom.test", "Dott.ssa Elena Costa (resp. clinico)", "clinical_lead");
  await mk("hr@acme.test", "Sara Conti (HR Acme)", "hr", { companyId: acme.id });
  await mk("hr@beta.test", "Luca Gallo (HR Beta)", "hr", { companyId: beta.id });

  /* specialisti */
  const specs: [string, string, string, string, string[], string[], string[], string, number, "f" | "m"][] = [
    ["laura@specialisti.test", "Laura Bianchi", "Psicologa e psicoterapeuta perinatale", "Ti accompagno nel primo periodo dopo la nascita e nel rientro al lavoro, con un approccio centrato sulla persona e sul carico di cura.", ["perinatale", "psicologia"], ["it", "en"], ["0-2", "3-5"], "Ordine Psicologi Lazio", 4900, "f"],
    ["marco@specialisti.test", "Marco Rossi", "Psicologo, terapeuta di coppia", "Lavoro con coppie e genitori su comunicazione, divisione dei carichi e co-genitorialità.", ["coppia", "psicologia"], ["it"], ["3-5", "6-11", "12-17"], "Ordine Psicologi Lombardia", 5900, "m"],
    ["giulia@specialisti.test", "Giulia Ferri", "Logopedista", "Valutazione e percorsi sul linguaggio in età evolutiva, con coinvolgimento dei genitori.", ["logopedia"], ["it", "es"], ["0-2", "3-5", "6-11"], "Albo Logopedisti", 4500, "f"],
    ["chiara@specialisti.test", "Chiara Neri", "Consulente del sonno infantile", "Routine del sonno rispettose dei bisogni di bambini e genitori, dai primi mesi ai 5 anni.", ["sonno", "perinatale"], ["it", "en"], ["0-2", "3-5"], "Associazione Consulenti Sonno", 4900, "f"],
    ["paolo@specialisti.test", "Paolo Verdi", "Coach per il rientro al lavoro", "Percorsi di coaching per riorganizzare tempo, priorità e carico mentale dopo la maternità o paternità.", ["coaching", "psicologia"], ["it", "en", "es"], ["3-5", "6-11"], "Associazione Coach Professionisti", 4900, "m"],
  ];
  const specUsers: (typeof users.$inferSelect)[] = [];
  for (const [email, name, title, approach, sp, langs, ages, reg, price, gender] of specs) {
    const u = await mk(email, name, "specialist");
    await db.insert(specialistProfiles).values({
      userId: u.id, title, approach, bio: `${name} lavora con famiglie e genitori che lavorano.`, specializations: sp, languages: langs, ageGroups: ages, gender, registryName: reg, registryNumber: String(10000 + specUsers.length * 137),
      rcPolicyNumber: `RC-${2000 + specUsers.length}`, responseHours: "Lun-ven entro 24 ore", priceCents: price, status: "approved", published: true, approvedAt: now, weeklyCapacity: 20,
    });
    await db.insert(consents).values([{ userId: u.id, kind: "specialist_contract", version: DOC_VERSIONS.specialist_contract }, { userId: u.id, kind: "code_of_conduct", version: DOC_VERSIONS.code_of_conduct }]);
    const days = specUsers.length % 2 === 0 ? [1, 2, 3, 4, 5] : [1, 2, 4, 5, 6];
    for (const d of days) {
      await db.insert(availabilityRules).values([
        { specialistId: u.id, weekday: d, startMin: 9 * 60, endMin: 13 * 60, kind: "session" },
        { specialistId: u.id, weekday: d, startMin: 15 * 60, endMin: 19 * 60, kind: "session" },
        { specialistId: u.id, weekday: d, startMin: 14 * 60, endMin: 15 * 60, kind: "intro" },
      ]);
    }
    specUsers.push(u);
  }
  // candidata in attesa (pipeline)
  const cand = await mk("candidata@specialisti.test", "Francesca Sala", "specialist");
  await db.update(users).set({ totpEnabled: false, totpSecretEnc: null }).where(eq(users.id, cand.id));
  await db.insert(specialistProfiles).values({ userId: cand.id, title: "Psicologa clinica", cvText: "5 anni di esperienza in consultorio familiare.", registryName: "Ordine Psicologi Toscana", registryNumber: "77777", rcPolicyNumber: "RC-9999", specializations: ["psicologia"], status: "reviewing" });

  /* utenti */
  await mk("nuova@test.it", "Marta Nuova", "user");
  const anna = await mk("anna@acme.test", "Anna Demo", "user", { companyId: acme.id, coverageKind: "employee", onboardingPath: "code", gender: "f", birthYear: 1988, site: "Roma", jobLevel: "impiegata" });
  await db.update(accessCodes).set({ usedCount: 1 }).where(eq(accessCodes.code, "ACME2026"));
  await db.insert(creditLedger).values({ companyId: acme.id, userId: anna.id, delta: 3, reason: "grant" });
  await db.insert(consents).values([
    { userId: anna.id, kind: "terms", version: DOC_VERSIONS.terms }, { userId: anna.id, kind: "privacy", version: DOC_VERSIONS.privacy },
    { userId: anna.id, kind: "health_data", version: DOC_VERSIONS.health_data }, { userId: anna.id, kind: "aggregate_use", version: DOC_VERSIONS.aggregate_use },
  ]);
  await db.insert(intakeProfiles).values({
    userId: anna.id, step: 6, completedAt: now,
    dataEnc: encryptJson({ path: "me", stage: "3-6", situations: ["carico_mentale", "identita"], area: "carico_mentale", childrenCount: 2, childAgeGroups: ["3-5"], language: "it", gender: "any", times: ["sera"], previousTherapy: "no", risk1: "no", risk2: "no" }),
  });
  await db.insert(users).values({ email: "privato@test.it", fullName: "Paola Privata", passwordHash: hash, emailVerifiedAt: verified, onboardingPath: "private", gender: "f", birthYear: 1990 });

  const laura = specUsers[0];
  await db.insert(careRelationships).values({ userId: anna.id, specialistId: laura.id, status: "active" });
  const th = (await db.insert(threads).values({ userId: anna.id, specialistId: laura.id }).returning())[0];
  const past = (d: number, h: number) => DateTime.now().setZone("Europe/Rome").minus({ days: d }).set({ hour: h, minute: 0, second: 0, millisecond: 0 }).toJSDate();
  const intro = (await db.insert(appointments).values({ userId: anna.id, specialistId: laura.id, kind: "intro", startsAt: past(10, 14), endsAt: past(10, 14), status: "completed", paymentSource: "free" }).returning())[0];
  const sess = (await db.insert(appointments).values({ userId: anna.id, specialistId: laura.id, kind: "session", startsAt: past(3, 17), endsAt: DateTime.fromJSDate(past(3, 17)).plus({ minutes: 50 }).toJSDate(), status: "completed", paymentSource: "credit", priceCents: 4900 }).returning())[0];
  await db.update(appointments).set({ endsAt: DateTime.fromJSDate(intro.startsAt).plus({ minutes: 20 }).toJSDate() }).where(eq(appointments.id, intro.id));
  await db.insert(creditLedger).values({ companyId: acme.id, userId: anna.id, delta: -1, reason: "consume", appointmentId: sess.id });
  await db.insert(payments).values({ userId: anna.id, appointmentId: sess.id, specialistId: laura.id, amountCents: 4900, feeCents: 1470, specialistNetCents: 3430, source: "company_credit", status: "paid", provider: "company", paidAt: past(3, 18) });
  await db.insert(messages).values([
    { threadId: th.id, senderId: laura.id, bodyEnc: encryptText("Ciao Anna, grazie per la chiacchierata di ieri. Se vuoi ci vediamo la prossima settimana."), createdAt: past(2, 9) },
    { threadId: th.id, senderId: anna.id, bodyEnc: encryptText("Grazie Laura, volentieri!"), createdAt: past(2, 10) },
  ]);

  /* dati analitici sintetici (nessuna identità collegata) */
  const areas = ["sonno", "carico_mentale", "carico_mentale", "rientro", "coppia", "linguaggio", "alimentazione"];
  const resp = (p: string, instrument: string, moment: string, base: number, shift: number, at: Date) => {
    const q = QUESTIONNAIRES[instrument];
    const score = scoreQuestionnaire(q, Object.fromEntries(q.items.map((it) => [it.id, Math.max(q.scale.min, Math.min(q.scale.max, Math.round((base + shift * (q.scale.max - q.scale.min) + (rnd() - 0.5) * 1.2) * 1) ))]))) ?? 50;
    return { pseudonym: p, instrument, version: q.version, moment, score, items: {}, answeredAt: at };
  };
  const evRows: (typeof events.$inferInsert)[] = [];
  const respRows: (typeof responses.$inferInsert)[] = [];
  const subjRows: (typeof subjects.$inferInsert)[] = [];
  const makeCohort = (companyId: string, n: number, tag: string) => {
    for (let i = 0; i < n; i++) {
      const p = `p_seed_${tag}_${i}`;
      const reg = DateTime.now().minus({ days: 5 + Math.floor(rnd() * 80) });
      const gender = rnd() < 0.7 ? "f" : rnd() < 0.85 ? "m" : "x";
      subjRows.push({ pseudonym: p, companyId, gender, ageBand: pick(["<30", "30-39", "30-39", "40-49"]), childrenCount: 1 + Math.floor(rnd() * 3), childrenAgeBand: pick(["0-2", "3-5", "6-11"]), site: pick(["Roma", "Milano"]), jobLevel: pick(["impiegata", "quadro"]), area: pick(areas), firstPath: rnd() < 0.67, consentAggregate: i % 10 !== 9, registeredAt: reg.toJSDate() });
      evRows.push({ pseudonym: p, type: "registered", occurredAt: reg.toJSDate(), meta: {} });
      evRows.push({ pseudonym: p, type: "intake_done", occurredAt: reg.plus({ hours: 1 }).toJSDate(), meta: {} });
      evRows.push({ pseudonym: p, type: "intro_booked", occurredAt: reg.plus({ days: 1 + Math.floor(rnd() * 5) }).toJSDate(), meta: {} });
      const hasIntro = rnd() < 0.85;
      if (hasIntro) evRows.push({ pseudonym: p, type: "intro_done", occurredAt: reg.plus({ days: 6 }).toJSDate(), meta: {} });
      if (hasIntro && rnd() < 0.75) {
        evRows.push({ pseudonym: p, type: "session_booked", occurredAt: reg.plus({ days: 7 }).toJSDate(), meta: {} });
        evRows.push({ pseudonym: p, type: "credit_used", occurredAt: reg.plus({ days: 7 }).toJSDate(), meta: {} });
        const sessions = 1 + Math.floor(rnd() * 4);
        for (let s = 0; s < sessions; s++) evRows.push({ pseudonym: p, type: "session_done", occurredAt: reg.plus({ days: 8 + s * 7 }).toJSDate(), meta: {} });
        respRows.push(resp(p, "who5", "T0", 2, 0, reg.toJSDate()), resp(p, "mental_load", "T0", 4, 0, reg.toJSDate()), resp(p, "care_load", "T0", 3.5, 0, reg.toJSDate()));
        if (tag === "acme") {
          const q = (x: number) => Math.min(5, Math.max(1, Math.round(x + (rnd() - 0.5) * 1.6)));
          const aIt = { A1: q(4), A2: q(3), A3: q(2.3), A4: 1 + Math.floor(rnd() * 4), A5: q(2.6), A6: 1 + Math.floor(rnd() * 3), A7: q(3), A9: 1, A10: 2 };
          respRows.push({ pseudonym: p, instrument: "kpi_a", version: "A-1.0", moment: "T0", score: null, items: aIt, answeredAt: reg.toJSDate() });
          if (sessions >= 3) respRows.push({ pseudonym: p, instrument: "kpi_c", version: "C-1.0", moment: "T2", score: null, items: { C1: q(aIt.A1 - 1.2), C2: q(aIt.A2 - 1), C3: q(aIt.A3 + 1), C4: q(aIt.A5 + 0.8), C5: q(aIt.A7 + 0.6), C6: Math.max(1, aIt.A6 - 1), C7: q(3.8), [`C8.${1 + Math.floor(rnd() * 5)}`]: 1, C9: 1 + Math.floor(rnd() * 3) }, answeredAt: reg.plus({ days: 90 }).toJSDate() });
        }
        if (sessions >= 2) {
          const t1 = reg.plus({ days: 30 }).toJSDate();
          respRows.push(resp(p, "who5", "T1", 3, 0, t1), resp(p, "mental_load", "T1", 3, 0, t1), resp(p, "care_load", "T1", 2.8, 0, t1), resp(p, "satisfaction", "T1", 4.3, 0, t1));
        }
      }
      if (hasIntro && rnd() < 0.12) evRows.push({ pseudonym: p, type: "specialist_changed", occurredAt: reg.plus({ days: 7 }).toJSDate(), meta: {} });
    }
  };
  makeCohort(acme.id, 70, "acme");
  makeCohort(beta.id, 4, "beta"); // sotto soglia: deve restare nascosto
  // Anna ha già fatto il check-in iniziale: non deve essere rimandata all'onboarding
  const annaP = newPseudonym();
  await db.insert(pseudonymMap).values({ userId: anna.id, pseudonym: annaP });
  const annaReg = DateTime.now().minus({ days: 12 }).toJSDate();
  subjRows.push({ pseudonym: annaP, companyId: acme.id, gender: "f", ageBand: "30-39", childrenCount: 2, childrenAgeBand: "3-5", site: "Roma", jobLevel: "impiegata", area: "carico_mentale", firstPath: true, consentAggregate: true, registeredAt: annaReg });
  respRows.push(resp(annaP, "who5", "T0", 2, 0, annaReg), resp(annaP, "mental_load", "T0", 4, 0, annaReg), resp(annaP, "care_load", "T0", 3.5, 0, annaReg));
  await db.insert(subjects).values(subjRows);
  await db.insert(events).values(evRows);
  await db.insert(responses).values(respRows);
  void pseudonymMap;
  void newPseudonym;

  // B-10 / K-14: due rilevazioni dell'indagine aziendale anonima (14 e 18 risposte: sopra la soglia)
  for (const [round, n, base] of [[1, 14, 0.45], [2, 18, 0.62]] as const) {
    const [sv] = await db.insert(companySurveys).values({ companyId: acme.id, title: `Indagine genitorialità e cura — rilevazione ${round}`, token: `demo-acme-r${round}`, round, status: round === 1 ? "closed" : "open", createdAt: DateTime.now().minus({ days: round === 1 ? 90 : 10 }).toJSDate() }).returning();
    const rows = Array.from({ length: n }, (_, i) => {
      const pick = (off: number) => Math.min(5, Math.max(1, Math.round(1 + ((i * 7 + off) % 5) * 0.5 + base * 3)));
      const items: Record<string, number> = { E1: 1 + (i % 4), E2: pick(0), E3: pick(1), E4: pick(2), E5: pick(3), E8: pick(4), E10: 1 + (i % 3), E11: 1 + (i % 5) };
      items[`E6.${1 + (i % 4)}`] = 1; items[`E6.${1 + ((i + 1) % 4)}`] = 1;
      items[`E7.${1 + (i % 4)}`] = 1;
      items[`E9.${1 + (i % 8)}`] = 1; items[`E9.${1 + ((i + 3) % 8)}`] = 1;
      return { pseudonym: `sv_demo_${round}_${i}`, instrument: "company_survey", version: "E-1.0", moment: sv.id, score: items.E5, items };
    });
    await db.insert(responses).values(rows);
  }
  // B-11: calendario eventi
  const evDay = (d: number) => {
    let t = DateTime.now().setZone("Europe/Rome").plus({ days: d }).set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
    while (t.weekday > 5) t = t.plus({ days: 1 });
    return t.toJSDate();
  };
  await db.insert(trainingEvents).values([
    { title: "Genitorialità e lavoro: come organizzarsi", topic: "genitorialita", description: "Talk con una psicologa su equilibrio tra carriera e famiglia.", startsAt: evDay(14), durationMin: 60 },
    { title: "Il carico di cura in famiglia", topic: "carico_di_cura", description: "Workshop su divisione dei compiti e carico mentale.", startsAt: evDay(25), durationMin: 90 },
    { title: "Rientro dalla maternità", topic: "rientro_maternita", description: "Incontro per chi rientra al lavoro e per i suoi responsabili.", startsAt: evDay(40), durationMin: 60 },
  ]);
  // S-12: qualche valutazione sulle sedute già svolte
  const done = await db.select().from(appointments).where(eq(appointments.status, "completed"));
  for (const [i, a] of done.entries()) await db.insert(ratings).values({ appointmentId: a.id, userId: a.userId, specialistId: a.specialistId, score: 4 + (i % 2) }).onConflictDoNothing();

  console.log("Seed completato.");
  console.log(`Password per tutti: ${PASSWORD}  ·  2FA staff/specialisti (segreto di prova): ${DEMO_TOTP}`);
  sqlClient.close();
}

main().catch(async (e) => {
  console.error(e);
  sqlClient.close();
  process.exit(1);
});
