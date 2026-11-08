/**
 * Collaudo sui flussi dell'Allegato A §10.3, contro un database vero (workingmom_test).
 * Eseguire con: npm run test:flows
 */
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DEV_ALLOW_EARLY_OUTCOME = "1";

type Mods = {
  db: typeof import("@/db");
  booking: typeof import("../booking");
  codes: typeof import("../codes");
  intake: typeof import("../intake");
  slots: typeof import("../slotsDb");
  billing: typeof import("../billing");
  kpi: typeof import("../kpi");
  gdpr: typeof import("../gdpr");
  chat: typeof import("../chat");
  spec: typeof import("../specialist");
};
let m: Mods;
let laura: { id: string };
let marco: { id: string };
let seq = 0;

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("workingmom_test")) throw new Error("Questi test vanno eseguiti sul DB workingmom_test");
  m = {
    db: await import("@/db"),
    booking: await import("../booking"),
    codes: await import("../codes"),
    intake: await import("../intake"),
    slots: await import("../slotsDb"),
    billing: await import("../billing"),
    kpi: await import("../kpi"),
    gdpr: await import("../gdpr"),
    chat: await import("../chat"),
    spec: await import("../specialist"),
  };
  const { db, users } = m.db;
  [laura] = await db.select({ id: users.id }).from(users).where(eq(users.email, "laura@specialisti.test"));
  [marco] = await db.select({ id: users.id }).from(users).where(eq(users.email, "marco@specialisti.test"));
});

async function newUser(domain = "test.it") {
  const { db, users, consents } = m.db;
  const [u] = await db.insert(users).values({ email: `t${Date.now()}-${seq++}@${domain}`, fullName: "Test Utente", role: "user", emailVerifiedAt: new Date(), passwordHash: "x", onboardingPath: "private" }).returning();
  void consents;
  return u;
}

async function onboard(userId: string, over: Record<string, unknown> = {}) {
  const { db, consents } = m.db;
  await db.insert(consents).values([{ userId, kind: "health_data", version: "t" }, { userId, kind: "aggregate_use", version: "t" }]);
  const steps: Record<string, unknown>[] = [{ area: "sonno", notes: "" }, { childrenCount: 1, childAgeGroups: ["3-5"] }, { language: "it", gender: "any", times: [] }, { previousTherapy: "no" }, { risk1: "no", risk2: "no", ...over }];
  let last = { safety: false, completed: false };
  for (let i = 0; i < steps.length; i++) last = await m.intake.saveIntakeStep(userId, i, steps[i]);
  return last;
}

/** Porta un utente fino a "percorso attivo" con uno specialista. */
async function activeWith(userId: string, specialistId: string) {
  const [slot] = await m.slots.loadSlots(specialistId, "intro");
  const a = await m.booking.bookIntro(userId, specialistId, slot.startsAt);
  await m.booking.markOutcome(a.id, specialistId, "completed");
  await m.booking.continueWithSpecialist(userId, specialistId);
  return a;
}

async function freeSessionSlots(specialistId: string, n: number) {
  const all = await m.slots.loadSlots(specialistId, "session", { days: 60 });
  const out = [];
  let lastEnd = 0;
  for (const s of all) {
    if (s.startsAt.getTime() > lastEnd) {
      out.push(s);
      lastEnd = s.endsAt.getTime() + 2 * 86_400_000;
    }
    if (out.length === n) break;
  }
  return out;
}

const getAppt = async (id: string) => (await m.db.db.select().from(m.db.appointments).where(eq(m.db.appointments.id, id)))[0];
const getPay = async (apptId: string) => (await m.db.db.select().from(m.db.payments).where(eq(m.db.payments.appointmentId, apptId)))[0];

describe("Scenario 1 — privato: questionario, colloquio, seduta pagata, fattura", () => {
  it("percorso completo", async () => {
    const u = await newUser();
    expect((await onboard(u.id)).completed).toBe(true);
    const intro = await activeWith(u.id, laura.id);
    expect((await getAppt(intro.id)).status).toBe("completed");
    expect(intro.paymentSource).toBe("free");

    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    expect(r.pendingPaymentIds).toHaveLength(1);
    const apptId = r.appointmentIds[0];
    expect((await getAppt(apptId)).status).toBe("pending_payment"); // non confermata senza incasso

    await m.booking.completePayments(r.pendingPaymentIds, "pi_test");
    const a = await getAppt(apptId);
    expect(a.status).toBe("booked");
    expect(a.videoRoomUrl).toBeTruthy();
    const pay = await getPay(apptId);
    expect(pay.status).toBe("paid");
    expect(pay.feeCents + pay.specialistNetCents).toBe(pay.amountCents);
    const inv = await m.db.db.select().from(m.db.invoices).where(eq(m.db.invoices.paymentId, pay.id));
    expect(inv).toHaveLength(1);
    expect(inv[0].totalCents).toBe(pay.amountCents);
    expect(inv[0].number).toMatch(/^WM-\d{4}-\d{6}$/);
  });

  it("senza colloquio svolto non si prenota una seduta", async () => {
    const u = await newUser();
    await onboard(u.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    await expect(m.booking.bookSessions(u.id, laura.id, [slot.startsAt])).rejects.toThrow(/colloquio gratuito/);
  });

  it("un solo colloquio gratuito per specialista", async () => {
    const u = await newUser();
    await onboard(u.id);
    const slots = await m.slots.loadSlots(laura.id, "intro");
    await m.booking.bookIntro(u.id, laura.id, slots[0].startsAt);
    await expect(m.booking.bookIntro(u.id, laura.id, slots[1].startsAt)).rejects.toThrow(/già un colloquio/);
  });

  it("due utenti sullo stesso slot: ne passa uno solo", async () => {
    const [a, b] = [await newUser(), await newUser()];
    await onboard(a.id);
    await onboard(b.id);
    const [slot] = await m.slots.loadSlots(marco.id, "intro");
    const res = await Promise.allSettled([m.booking.bookIntro(a.id, marco.id, slot.startsAt), m.booking.bookIntro(b.id, marco.id, slot.startsAt)]);
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(res.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
});

describe("Scenario 2 — dipendente con codice: crediti prima, poi pagamento personale", () => {
  it("scala i crediti a ogni seduta e passa al personale senza errori", async () => {
    const u = await newUser("acme.test");
    const cov = await m.codes.redeemCode(u.id, u.email, "ACME2026");
    expect(cov.includedSessions).toBe(3);
    expect(await m.codes.creditBalance(u.id)).toBe(3);
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const slots = await freeSessionSlots(laura.id, 4);

    for (let i = 0; i < 3; i++) {
      const r = await m.booking.bookSessions(u.id, laura.id, [slots[i].startsAt]);
      expect(r.pendingPaymentIds).toHaveLength(0);
      expect((await getAppt(r.appointmentIds[0])).status).toBe("booked");
      expect(await m.codes.creditBalance(u.id)).toBe(2 - i);
    }
    const r4 = await m.booking.bookSessions(u.id, laura.id, [slots[3].startsAt]);
    expect(r4.pendingPaymentIds).toHaveLength(1);
    const p = await getPay(r4.appointmentIds[0]);
    expect(p.source).toBe("personal");
    expect(p.amountCents).toBe(Math.round(4900 * 0.8)); // 20% di sconto sulle successive
  });
});

describe("Scenario 3 — codici non validi", () => {
  const cases: [string, string, RegExp][] = [
    ["SCADUTO1", "acme.test", /scaduto/],
    ["REVOCATO", "acme.test", /non valido/],
    ["ACME2026", "gmail.com", /email aziendale/],
    ["NONESISTE", "acme.test", /non valido/],
  ];
  for (const [code, domain, msg] of cases) {
    it(`${code} da @${domain}`, async () => {
      const u = await newUser(domain);
      await expect(m.codes.redeemCode(u.id, u.email, code)).rejects.toThrow(msg);
      const [row] = await m.db.db.select().from(m.db.users).where(eq(m.db.users.id, u.id));
      expect(row.companyId).toBeNull();
      expect(await m.codes.creditBalance(u.id)).toBe(0);
    });
  }
  it("codice monouso esaurito", async () => {
    const [a, b] = [await newUser("acme.test"), await newUser("acme.test")];
    await m.codes.redeemCode(a.id, a.email, "MONO0001");
    await expect(m.codes.redeemCode(b.id, b.email, "MONO0001")).rejects.toThrow(/già stato utilizzato/);
  });
  it("azienda sospesa o scaduta: nessun benefit", async () => {
    const { db, companies } = m.db;
    await db.update(companies).set({ status: "suspended" }).where(eq(companies.slug, "beta"));
    const u = await newUser("beta.test");
    await expect(m.codes.redeemCode(u.id, u.email, "BETA2026")).rejects.toThrow(/non valido/);
    await db.update(companies).set({ status: "active" }).where(eq(companies.slug, "beta"));
  });
});

describe("Scenario 4 — disdetta entro e oltre il preavviso", () => {
  async function creditSession() {
    const u = await newUser("acme.test");
    await m.codes.redeemCode(u.id, u.email, "ACME2026");
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    return { u, id: r.appointmentIds[0] };
  }
  it("entro il preavviso: credito ripristinato", async () => {
    const { u, id } = await creditSession();
    expect(await m.codes.creditBalance(u.id)).toBe(2);
    await m.db.db.update(m.db.appointments).set({ startsAt: new Date(Date.now() + 3 * 86_400_000), endsAt: new Date(Date.now() + 3 * 86_400_000 + 3_000_000) }).where(eq(m.db.appointments.id, id));
    const r = await m.booking.cancelAppointment(id, { id: u.id, role: "user" });
    expect(r.status).toBe("cancelled");
    expect(await m.codes.creditBalance(u.id)).toBe(3);
  });
  it("oltre il preavviso: seduta addebitata, credito non restituito", async () => {
    const { u, id } = await creditSession();
    await m.db.db.update(m.db.appointments).set({ startsAt: new Date(Date.now() + 2 * 3_600_000), endsAt: new Date(Date.now() + 2 * 3_600_000 + 3_000_000) }).where(eq(m.db.appointments.id, id));
    const r = await m.booking.cancelAppointment(id, { id: u.id, role: "user" });
    expect(r.status).toBe("cancelled_late");
    expect(await m.codes.creditBalance(u.id)).toBe(2);
    expect((await getPay(id)).status).toBe("paid");
  });
  it("pagamento personale: rimborso entro il preavviso con nota di credito", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    await m.booking.completePayments(r.pendingPaymentIds, "pi_x");
    await m.db.db.update(m.db.appointments).set({ startsAt: new Date(Date.now() + 3 * 86_400_000), endsAt: new Date(Date.now() + 3 * 86_400_000 + 3_000_000) }).where(eq(m.db.appointments.id, r.appointmentIds[0]));
    await m.booking.cancelAppointment(r.appointmentIds[0], { id: u.id, role: "user" });
    const pay = await getPay(r.appointmentIds[0]);
    expect(pay.status).toBe("refunded");
    const inv = await m.db.db.select().from(m.db.invoices).where(eq(m.db.invoices.paymentId, pay.id));
    expect(inv.map((i) => i.kind).sort()).toEqual(["credit_note", "invoice"]);
    expect(inv.reduce((s, i) => s + i.totalCents, 0)).toBe(0);
  });
  it("promemoria a 24 ore inviato una sola volta", async () => {
    const { u, id } = await creditSession();
    await m.db.db.update(m.db.appointments).set({ startsAt: new Date(Date.now() + 23.5 * 3_600_000), endsAt: new Date(Date.now() + 24.5 * 3_600_000) }).where(eq(m.db.appointments.id, id));
    const count = async () => (await m.db.db.select().from(m.db.emailOutbox).where(and(eq(m.db.emailOutbox.toEmail, u.email), eq(m.db.emailOutbox.templateKey, "reminder_24h")))).length;
    await m.booking.sendReminders();
    expect(await count()).toBe(1);
    await m.booking.sendReminders();
    expect(await count()).toBe(1);
  });
});

describe("Scenario 5 — pagamento fallito e rimborso", () => {
  it("la seduta non resta confermata senza incasso e lo slot torna libero", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    await m.booking.failPayments(r.pendingPaymentIds, "Carta rifiutata");
    expect((await getAppt(r.appointmentIds[0])).status).toBe("cancelled");
    expect((await getPay(r.appointmentIds[0])).status).toBe("failed");
    const again = await m.slots.loadSlots(laura.id, "session", { days: 60 });
    expect(again.some((s) => s.startsAt.getTime() === slot.startsAt.getTime())).toBe(true);
  });
  it("hold scaduto: libera lo slot; pagamento tardivo lo riprende se ancora libero", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    await m.db.db.update(m.db.appointments).set({ holdUntil: new Date(Date.now() - 1000) }).where(eq(m.db.appointments.id, r.appointmentIds[0]));
    await m.slots.expireHolds();
    expect((await getAppt(r.appointmentIds[0])).status).toBe("cancelled");
    await m.booking.completePayments(r.pendingPaymentIds, "pi_late");
    expect((await getAppt(r.appointmentIds[0])).status).toBe("booked");
  });
  it("pagamento tardivo con slot già preso: rimborsato, non confermato", async () => {
    const [u1, u2] = [await newUser(), await newUser()];
    for (const u of [u1, u2]) {
      await onboard(u.id);
      await activeWith(u.id, laura.id);
    }
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r1 = await m.booking.bookSessions(u1.id, laura.id, [slot.startsAt]);
    await m.db.db.update(m.db.appointments).set({ holdUntil: new Date(Date.now() - 1000) }).where(eq(m.db.appointments.id, r1.appointmentIds[0]));
    await m.slots.expireHolds();
    const r2 = await m.booking.bookSessions(u2.id, laura.id, [slot.startsAt]);
    await m.booking.completePayments(r2.pendingPaymentIds, "pi_2");
    await m.booking.completePayments(r1.pendingPaymentIds, "pi_1");
    expect((await getAppt(r1.appointmentIds[0])).status).toBe("cancelled");
    expect((await getPay(r1.appointmentIds[0])).status).toBe("refunded");
    expect((await getAppt(r2.appointmentIds[0])).status).toBe("booked");
  });
});

describe("Scenario 6 — cambio specialista senza costi e senza perdere crediti", () => {
  it("rimborsa le sedute future e ripristina i crediti", async () => {
    const u = await newUser("acme.test");
    await m.codes.redeemCode(u.id, u.email, "ACME2026");
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    expect(await m.codes.creditBalance(u.id)).toBe(2);
    await m.booking.changeSpecialist(u.id, laura.id);
    expect(await m.codes.creditBalance(u.id)).toBe(3);
    const [rel] = await m.db.db.select().from(m.db.careRelationships).where(and(eq(m.db.careRelationships.userId, u.id), eq(m.db.careRelationships.specialistId, laura.id)));
    expect(rel.status).toBe("changed");
    // e può fare un nuovo colloquio gratuito con un altro specialista
    const [s2] = await m.slots.loadSlots(marco.id, "intro");
    const a2 = await m.booking.bookIntro(u.id, marco.id, s2.startsAt);
    expect(a2.paymentSource).toBe("free");
  });
});

describe("Scenario 7 — risposte a rischio", () => {
  it("la prenotazione si ferma", async () => {
    const u = await newUser();
    const res = await onboard(u.id, { risk1: "yes" });
    expect(res.safety).toBe(true);
    const [slot] = await m.slots.loadSlots(laura.id, "intro");
    await expect(m.booking.bookIntro(u.id, laura.id, slot.startsAt)).rejects.toThrow(/sospesa/);
    const ev = await m.db.db.select().from(m.db.safetyEvents).where(eq(m.db.safetyEvents.userId, u.id));
    expect(ev).toHaveLength(1);
  });
  it("una parola di allarme nelle note blocca allo stesso modo", async () => {
    const u = await newUser();
    await m.db.db.insert(m.db.consents).values({ userId: u.id, kind: "health_data", version: "t" });
    const r = await m.intake.saveIntakeStep(u.id, 0, { area: "altro", notes: "a volte penso di farla finita" });
    expect(r.safety).toBe(true);
  });
});

describe("Scenario 8 — report HR sotto soglia", () => {
  it("Acme (70 persone) mostra dati, Beta (4) non mostra nulla", async () => {
    const { db, companies } = m.db;
    const [acme] = await db.select().from(companies).where(eq(companies.slug, "acme"));
    const [beta] = await db.select().from(companies).where(eq(companies.slug, "beta"));
    const f = { from: new Date(Date.now() - 365 * 86_400_000), to: new Date() };
    const a = await m.kpi.kpisForCompany(acme.id, f);
    expect(a.belowThreshold).toBe(false);
    expect(a.kpis.find((k) => k.key === "K-07")!.value).not.toBeNull();
    const b = await m.kpi.kpisForCompany(beta.id, f);
    expect(b.belowThreshold).toBe(true);
    for (const k of b.kpis) {
      expect(k.value).toBeNull();
      expect(k.breakdown).toBeUndefined();
    }
  });
  it("anche un filtro che restringe il gruppo sotto N nasconde tutto", async () => {
    const { db, companies } = m.db;
    const [acme] = await db.select().from(companies).where(eq(companies.slug, "acme"));
    const f = { from: new Date(Date.now() - 365 * 86_400_000), to: new Date() };
    const r = await m.kpi.kpisForCompany(acme.id, { ...f, site: "Milano", area: "alimentazione" });
    expect(r.belowThreshold).toBe(true);
    expect(r.kpis.every((k) => k.value === null && !k.breakdown)).toBe(true);
  });
});

describe("Scenario 9 — isolamento tra specialisti e backoffice", () => {
  it("uno specialista vede solo i propri utenti", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    expect((await m.spec.myClients(laura.id)).some((c) => c.rel.userId === u.id)).toBe(true);
    expect((await m.spec.myClients(marco.id)).some((c) => c.rel.userId === u.id)).toBe(false);
  });
  it("la chat è leggibile solo dai due partecipanti (non da altri specialisti né dal backoffice)", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const th = await m.booking.ensureThread(u.id, laura.id);
    await m.chat.sendMessage(th.id, u.id, "messaggio riservato", []);
    expect(await m.chat.getThread(th.id, laura.id)).not.toBeNull();
    expect(await m.chat.getThread(th.id, marco.id)).toBeNull();
    const [admin] = await m.db.db.select().from(m.db.users).where(eq(m.db.users.email, "admin@workingmom.test"));
    expect(await m.chat.getThread(th.id, admin.id)).toBeNull();
    // il contenuto nel DB è cifrato
    const raw = await m.db.db.select().from(m.db.messages).where(eq(m.db.messages.threadId, th.id));
    expect(raw[0].bodyEnc.startsWith("v1:")).toBe(true);
    expect(raw[0].bodyEnc).not.toContain("riservato");
  });
});

describe("Scenario 10 — cancellazione account", () => {
  it("rimuove dati personali; i report già emessi restano invariati", async () => {
    const { db, companies, reports } = m.db;
    const [acme] = await db.select().from(companies).where(eq(companies.slug, "acme"));
    const rep = await m.kpi.issueReport(acme.id, { from: new Date(Date.now() - 365 * 86_400_000), to: new Date() }, (await db.select().from(m.db.users).where(eq(m.db.users.email, "admin@workingmom.test")))[0].id);
    const before = JSON.stringify((await db.select().from(reports).where(eq(reports.id, rep.id)))[0].payload);

    const u = await newUser("acme.test");
    await m.codes.redeemCode(u.id, u.email, "ACME2026");
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const th = await m.booking.ensureThread(u.id, laura.id);
    await m.chat.sendMessage(th.id, u.id, "dato da cancellare", []);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    const paidAppt = r.appointmentIds[0];

    await m.gdpr.eraseUser(u.id, { id: u.id, role: "user" });

    const [row] = await db.select().from(m.db.users).where(eq(m.db.users.id, u.id));
    expect(row.email).toMatch(/^deleted-.+@deleted\.invalid$/);
    expect(row.fullName).toBeNull();
    expect(row.deletedAt).not.toBeNull();
    expect(await db.select().from(m.db.intakeProfiles).where(eq(m.db.intakeProfiles.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(m.db.threads).where(eq(m.db.threads.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(m.db.pseudonymMap).where(eq(m.db.pseudonymMap.userId, u.id))).toHaveLength(0);
    expect((await getAppt(paidAppt)).status).toBe("cancelled"); // appuntamento futuro annullato
    expect(await m.codes.creditBalance(u.id)).toBe(3); // il credito torna all'azienda
    const after = JSON.stringify((await db.select().from(reports).where(eq(reports.id, rep.id)))[0].payload);
    expect(after).toBe(before);
  });
  it("l'esportazione contiene i dati e decifra la chat", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const th = await m.booking.ensureThread(u.id, laura.id);
    await m.chat.sendMessage(th.id, u.id, "ciao esportazione", []);
    const data = await m.gdpr.exportUserData(u.id);
    expect(data.messages.map((x) => x.text)).toContain("ciao esportazione");
    expect(data.questionnaire).toMatchObject({ area: "sonno" });
  });
});

describe("Scenario 11 — pagamento diviso con rimborsi parziali", () => {
  it("il compenso è esatto dopo la commissione", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    await m.booking.completePayments(r.pendingPaymentIds, "pi_split");
    let p = await getPay(r.appointmentIds[0]);
    expect(p).toMatchObject({ amountCents: 4900, feeCents: 1470, specialistNetCents: 3430 });
    const res = await m.billing.refundPayment(p.id, 1000);
    expect(res.ok).toBe(true);
    p = await getPay(r.appointmentIds[0]);
    expect(p.status).toBe("partially_refunded");
    expect(p.refundedCents).toBe(1000);
    expect(p.feeCents).toBe(1170); // 30% di 3900
    expect(p.specialistNetCents).toBe(2730);
    expect(p.feeCents + p.specialistNetCents).toBe(4900 - 1000);
    const again = await m.billing.refundPayment(p.id, 99999); // oltre il residuo: tronca al residuo
    expect(again.ok).toBe(true);
    p = await getPay(r.appointmentIds[0]);
    expect(p.status).toBe("refunded");
    expect(p.specialistNetCents).toBe(0);
  });
  it("i compensi maturati escludono sedute non svolte e rimborsate", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, marco.id);
    const [slot] = await freeSessionSlots(marco.id, 1);
    const r = await m.booking.bookSessions(u.id, marco.id, [slot.startsAt]);
    await m.booking.completePayments(r.pendingPaymentIds, "pi_e");
    const e0 = await m.spec.earnings(marco.id);
    await m.booking.markOutcome(r.appointmentIds[0], marco.id, "completed");
    const e1 = await m.spec.earnings(marco.id);
    expect(e1.accrued.net - e0.accrued.net).toBe(5900 - Math.round(5900 * 0.3));
  });
});

describe("Scenario 12 — report di certificazione riproducibili", () => {
  it("stessi dati => stessi numeri, versione e periodo indicati; il report emesso non cambia", async () => {
    const { db, companies, reports, users } = m.db;
    const [acme] = await db.select().from(companies).where(eq(companies.slug, "acme"));
    const [admin] = await db.select().from(users).where(eq(users.email, "admin@workingmom.test"));
    const f = { from: new Date("2026-01-01"), to: new Date("2026-12-31T23:59:59") };
    const v1 = await m.kpi.issueReport(acme.id, f, admin.id);
    const v2 = await m.kpi.issueReport(acme.id, f, admin.id);
    expect(v2.version).toBe(v1.version + 1);
    expect(v2.supersedesId).toBe(v1.id);
    expect(JSON.stringify(v2.payload)).toBe(JSON.stringify(v1.payload));
    expect(v1.periodStart).toBe("2026-01-01");
    expect(v1.definitionsVersion).toBeTruthy();
    const still = (await db.select().from(reports).where(eq(reports.id, v1.id)))[0];
    expect(JSON.stringify(still.payload)).toBe(JSON.stringify(v1.payload));
  });
});

describe("Altri requisiti", () => {
  it("spostamento: solo entro il preavviso e su slot liberi", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [s1, s2] = await freeSessionSlots(laura.id, 2);
    const r = await m.booking.bookSessions(u.id, laura.id, [s1.startsAt]);
    await m.booking.completePayments(r.pendingPaymentIds, "pi_mv");
    await m.booking.rescheduleAppointment(r.appointmentIds[0], u.id, s2.startsAt);
    expect((await getAppt(r.appointmentIds[0])).startsAt.getTime()).toBe(s2.startsAt.getTime());
    await m.db.db.update(m.db.appointments).set({ startsAt: new Date(Date.now() + 3_600_000), endsAt: new Date(Date.now() + 4 * 3_600_000) }).where(eq(m.db.appointments.id, r.appointmentIds[0]));
    await expect(m.booking.rescheduleAppointment(r.appointmentIds[0], u.id, s1.startsAt)).rejects.toThrow(/preavviso/);
  });
  it("sedute ricorrenti: tutte confermate e pagate singolarmente", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const all = await m.slots.loadSlots(laura.id, "session", { days: 60 });
    const first = all[0];
    const starts = [0, 7, 14].map((d) => new Date(first.startsAt.getTime() + d * 86_400_000)).filter((s) => all.some((x) => x.startsAt.getTime() === s.getTime()));
    if (starts.length < 2) return; // disponibilità non ricorrente sulle prossime settimane
    const r = await m.booking.bookSessions(u.id, laura.id, starts);
    expect(r.appointmentIds).toHaveLength(starts.length);
    expect(r.pendingPaymentIds).toHaveLength(starts.length);
    const rows = await m.db.db.select().from(m.db.appointments).where(inArray(m.db.appointments.id, r.appointmentIds));
    expect(new Set(rows.map((x) => x.recurrenceId)).size).toBe(1);
  });
  it("lo specialista che annulla fa rimborsare l'utente", async () => {
    const u = await newUser();
    await onboard(u.id);
    await activeWith(u.id, laura.id);
    const [slot] = await freeSessionSlots(laura.id, 1);
    const r = await m.booking.bookSessions(u.id, laura.id, [slot.startsAt]);
    await m.booking.completePayments(r.pendingPaymentIds, "pi_sp");
    await m.booking.cancelAppointment(r.appointmentIds[0], { id: laura.id, role: "specialist" });
    expect((await getAppt(r.appointmentIds[0])).status).toBe("cancelled_by_specialist");
    expect((await getPay(r.appointmentIds[0])).status).toBe("refunded");
  });
  it("registro crediti aziendale sotto soglia non espone dettagli all'HR", async () => {
    const { db, companies } = m.db;
    const [beta] = await db.select().from(companies).where(eq(companies.slug, "beta"));
    const r = await m.kpi.creditRegistry(beta.id);
    expect(r.suppressed).toBe(true);
    expect(r.users).toBeNull();
  });
  it("i campi sensibili non finiscono in chiaro nel database", async () => {
    const { sqlClient } = m.db;
    const rows = await sqlClient`select data_enc from clinical.intake_profiles limit 5`;
    for (const r of rows) expect(String(r.data_enc).startsWith("v1:")).toBe(true);
    const like1 = await sqlClient`select count(*)::int n from clinical.intake_profiles where data_enc like '%sonno%'`;
    expect(like1[0].n).toBe(0);
  });
});

void like;
void sql;
