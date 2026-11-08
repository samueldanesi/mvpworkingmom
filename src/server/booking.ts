import { randomUUID } from "node:crypto";
import { and, count, eq, gt, gte, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  type ApptStatus,
  appointments,
  careRelationships,
  companies,
  consents,
  creditLedger,
  db,
  intakeProfiles,
  payments,
  specialistProfiles,
  threads,
  users,
} from "@/db";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { splitAmount } from "@/lib/payments";
import { createRoom } from "@/lib/video";
import { sendMail } from "@/lib/mail";
import { creditBalance } from "./codes";
import { issueInvoice, refundPayment } from "./billing";
import { notify } from "./notify";
import { getRules } from "./settings";
import { expireHolds, loadSlots } from "./slotsDb";
import { T1_AFTER_SESSIONS } from "@/lib/questionnaires";

export class BookingError extends Error {}

const ACTIVE = ["booked", "pending_payment"] as const;

function isUnique(e: unknown) {
  const msgs: string[] = [];
  for (let x = e as { message?: string; cause?: unknown } | undefined; x && msgs.length < 4; x = x.cause as typeof x) msgs.push(String(x.message ?? ""));
  return msgs.some((m) => /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(m));
}

/* ───────────────────────── prerequisiti ───────────────────────── */

export async function assertCanBook(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new BookingError("Utente non trovato.");
  if (!u.emailVerifiedAt) throw new BookingError("Conferma prima il tuo indirizzo email.");
  const [c] = await db
    .select({ n: count() })
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.kind, "health_data"), sql`${consents.revokedAt} is null`));
  if (!c.n) throw new BookingError("Serve il consenso al trattamento dei dati sulla salute.");
  const [intake] = await db.select().from(intakeProfiles).where(eq(intakeProfiles.userId, userId)).limit(1);
  if (!intake?.completedAt) throw new BookingError("Completa prima il questionario iniziale.");
  if (intake.safetyFlag) throw new BookingError("La prenotazione è sospesa: se hai bisogno di aiuto urgente usa i numeri di emergenza.");
  return u;
}

async function getBookableSpecialist(specialistId: string) {
  const [prof] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, specialistId)).limit(1);
  const [spec] = await db.select().from(users).where(eq(users.id, specialistId)).limit(1);
  if (!prof || !spec || prof.status !== "approved" || !prof.published) throw new BookingError("Specialista non disponibile.");
  return { prof, spec };
}

async function assertNoOverlap(userId: string, startsAt: Date, endsAt: Date, ignoreId?: string) {
  const rows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        or(eq(appointments.status, "booked"), eq(appointments.status, "pending_payment")),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
      ),
    );
  if (rows.some((r) => r.id !== ignoreId)) throw new BookingError("Hai già un altro appuntamento in quell'orario.");
}

async function upsertRelationship(userId: string, specialistId: string, status: "intro_booked") {
  const [rel] = await db
    .select()
    .from(careRelationships)
    .where(and(eq(careRelationships.userId, userId), eq(careRelationships.specialistId, specialistId)))
    .limit(1);
  if (!rel) {
    await db.insert(careRelationships).values({ userId, specialistId, status });
  } else if (["changed", "interrupted", "ended"].includes(rel.status)) {
    await db.update(careRelationships).set({ status, changeReason: null, updatedAt: new Date() }).where(eq(careRelationships.id, rel.id));
  }
}

export async function ensureThread(userId: string, specialistId: string) {
  await db.insert(threads).values({ userId, specialistId }).onConflictDoNothing();
  const [t] = await db
    .select()
    .from(threads)
    .where(and(eq(threads.userId, userId), eq(threads.specialistId, specialistId)))
    .limit(1);
  return t;
}

/* ───────────────────────── colloquio gratuito ───────────────────────── */

export async function bookIntro(userId: string, specialistId: string, startsAt: Date) {
  const u = await assertCanBook(userId);
  const { spec } = await getBookableSpecialist(specialistId);
  const slots = await loadSlots(specialistId, "intro");
  const slot = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot) throw new BookingError("Questo orario non è più disponibile. Scegline un altro.");
  await assertNoOverlap(userId, slot.startsAt, slot.endsAt);

  const prev = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.specialistId, specialistId),
        eq(appointments.kind, "intro"),
        inArray(appointments.status, ["booked", "completed", "no_show_user", "cancelled_late"]),
      ),
    );
  if (prev.length) throw new BookingError("Hai già un colloquio gratuito con questo specialista.");

  let appt: typeof appointments.$inferSelect;
  try {
    [appt] = await db
      .insert(appointments)
      .values({ userId, specialistId, kind: "intro", startsAt: slot.startsAt, endsAt: slot.endsAt, status: "booked", paymentSource: "free" })
      .returning();
  } catch (e) {
    if (isUnique(e)) throw new BookingError("Questo orario è stato appena preso da qualcun altro. Scegline un altro.");
    throw e;
  }
  await upsertRelationship(userId, specialistId, "intro_booked");
  await ensureThread(userId, specialistId);
  await announceBooked(appt.id);
  await track(userId, "intro_booked", { specialistId });
  void u;
  void spec;
  return appt;
}

/* ───────────────────────── sedute (singole o ricorrenti) ───────────────────────── */

export type SessionBookingResult = { appointmentIds: string[]; pendingPaymentIds: string[] };

export async function bookSessions(userId: string, specialistId: string, starts: Date[], recurrenceId?: string): Promise<SessionBookingResult> {
  if (!starts.length) throw new BookingError("Scegli almeno un orario.");
  if (starts.length > 12) throw new BookingError("Puoi prenotare al massimo 12 sedute alla volta.");
  await assertCanBook(userId);
  const { prof } = await getBookableSpecialist(specialistId);

  const [rel] = await db
    .select()
    .from(careRelationships)
    .where(and(eq(careRelationships.userId, userId), eq(careRelationships.specialistId, specialistId)))
    .limit(1);
  if (!rel || rel.status !== "active") throw new BookingError("Prima del colloquio gratuito scegli se proseguire con questo specialista.");

  const slots = await loadSlots(specialistId, "session", { days: 90 });
  const chosen = starts.map((st) => {
    const slot = slots.find((s) => s.startsAt.getTime() === st.getTime());
    if (!slot) throw new BookingError(`L'orario ${fmtDateTime(st)} non è più disponibile.`);
    return slot;
  });
  chosen.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (let i = 0; i < chosen.length; i++) {
    await assertNoOverlap(userId, chosen[i].startsAt, chosen[i].endsAt);
    if (i > 0 && chosen[i].startsAt < chosen[i - 1].endsAt) throw new BookingError("Orari sovrapposti.");
  }

  const rules = await getRules();
  const rec = recurrenceId ?? (chosen.length > 1 ? randomUUID() : undefined);
  const result: SessionBookingResult = { appointmentIds: [], pendingPaymentIds: [] };

  try {
    await db.transaction(async (tx) => {
      // SQLite serializza le scritture: due prenotazioni concorrenti dello stesso utente non spendono due volte lo stesso credito
      const [u] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const [co] = u.companyId ? await tx.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
      const now = new Date();
      const contractOk = !!co && co.status === "active" && (!co.endsAt || co.endsAt > now) && (!co.startsAt || co.startsAt <= now);
      const covered = !co || co.coveredSpecialties.length === 0 || prof.specializations.some((s) => co.coveredSpecialties.includes(s));
      const [bal] = await tx
        .select({ n: sql<number>`coalesce(sum(${creditLedger.delta}),0)` })
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId));
      let balance = bal?.n ?? 0;

      for (const slot of chosen) {
        const useCredit = contractOk && covered && u.coverageKind === "employee" && balance > 0;
        const discountPct = contractOk ? (u.coverageKind === "employee" ? co!.discountPct : u.coverageKind === "family" ? co!.familyDiscountPct : 0) : 0;
        const list = prof.priceCents;
        const charged = useCredit ? list : Math.round((list * (100 - discountPct)) / 100);
        const split = splitAmount(charged, rules.platformFeePct);
        const free = !useCredit && charged === 0;
        const status = useCredit || free ? "booked" : "pending_payment";

        const [appt] = await tx
          .insert(appointments)
          .values({
            userId,
            specialistId,
            kind: "session",
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status,
            recurrenceId: rec,
            priceCents: list,
            paymentSource: useCredit ? "credit" : "personal",
            holdUntil: status === "pending_payment" ? new Date(Date.now() + env.holdMinutes * 60_000) : null,
          })
          .returning();

        const [pay] = await tx
          .insert(payments)
          .values({
            userId,
            appointmentId: appt.id,
            specialistId,
            amountCents: charged,
            discountCents: list - charged,
            feeCents: split.feeCents,
            specialistNetCents: split.specialistNetCents,
            source: useCredit ? "company_credit" : "personal",
            status: useCredit || free ? "paid" : "pending",
            provider: useCredit ? "company" : env.paymentProvider,
            paidAt: useCredit || free ? new Date() : null,
          })
          .returning();

        if (useCredit) {
          balance -= 1;
          await tx.insert(creditLedger).values({
            companyId: co!.id,
            userId,
            delta: -1,
            reason: "consume",
            appointmentId: appt.id,
          });
        }
        result.appointmentIds.push(appt.id);
        if (status === "pending_payment") result.pendingPaymentIds.push(pay.id);
      }
    });
  } catch (e) {
    if (isUnique(e)) throw new BookingError("Uno degli orari è stato appena preso da qualcun altro. Riprova.");
    throw e;
  }

  // Le sedute coperte da crediti sono subito confermate; le altre aspettano il pagamento.
  const pendingAppts = new Set(
    (await db.select({ id: payments.appointmentId }).from(payments).where(inArray(payments.id, result.pendingPaymentIds.length ? result.pendingPaymentIds : ["00000000-0000-0000-0000-000000000000"]))).map((r) => r.id),
  );
  for (const id of result.appointmentIds) {
    if (!pendingAppts.has(id)) {
      await announceBooked(id);
      await track(userId, "session_booked", { specialistId, source: "credit" });
      if (id) await track(userId, "credit_used", { specialistId });
    }
  }
  return result;
}

/* ───────────────────────── pagamento ───────────────────────── */

/** Conferma i pagamenti andati a buon fine (webhook del fornitore o pagina mock). */
export async function completePayments(paymentIds: string[], providerRef?: string | null) {
  const done: string[] = [];
  for (const pid of paymentIds) {
    const [p] = await db.select().from(payments).where(eq(payments.id, pid)).limit(1);
    if (!p || !p.appointmentId) continue;
    const recoverable = p.status === "pending" || (p.status === "failed" && p.failureReason === "Tempo scaduto");
    if (!recoverable) continue;
    try {
      // se lo slot è scaduto ma ancora libero lo riprendiamo; l'indice univoco impedisce doppie prenotazioni
      await db.transaction(async (tx) => {
        await tx.update(appointments).set({ status: "booked", holdUntil: null, cancelledAt: null }).where(eq(appointments.id, p.appointmentId!));
        await tx
          .update(payments)
          .set({ status: "paid", paidAt: new Date(), providerRef: providerRef ?? p.providerRef, failureReason: null })
          .where(eq(payments.id, pid));
      });
    } catch (e) {
      if (isUnique(e)) {
        // slot preso da altri nel frattempo: l'incasso viene rimborsato, la seduta non è confermata
        await db.update(payments).set({ status: "paid", paidAt: new Date(), providerRef: providerRef ?? p.providerRef, failureReason: null }).where(eq(payments.id, pid));
        await refundPayment(pid);
        continue;
      }
      throw e;
    }
    await issueInvoice(pid);
    await announceBooked(p.appointmentId);
    await track(p.userId, "session_booked", { specialistId: p.specialistId, source: "personal" });
    done.push(pid);
  }
  return done;
}

export async function failPayments(paymentIds: string[], reason: string) {
  for (const pid of paymentIds) {
    const [p] = await db.select().from(payments).where(eq(payments.id, pid)).limit(1);
    if (!p || p.status !== "pending" || !p.appointmentId) continue;
    await db.update(payments).set({ status: "failed", failureReason: reason }).where(eq(payments.id, pid));
    const [a] = await db.select().from(appointments).where(eq(appointments.id, p.appointmentId)).limit(1);
    await db.update(appointments).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(appointments.id, a.id));
    const [u] = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
    await sendMail("payment_failed", u.email, { name: u.fullName ?? "", when: fmtDateTime(a.startsAt, u.timezone), link: `${env.appUrl}/app/specialists` });
    await notify(u.id, "Pagamento non riuscito: la seduta non è stata confermata.", "/app/appointments");
  }
}

/* ───────────────────────── annullamento / spostamento ───────────────────────── */

export type Actor = { id: string; role: string };

export async function cancelAppointment(apptId: string, actor: Actor, opts: { force?: boolean } = {}) {
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  if (!a) throw new BookingError("Appuntamento non trovato.");
  const bySpecialist = actor.id === a.specialistId;
  const byUser = actor.id === a.userId;
  if (!bySpecialist && !byUser && !opts.force) throw new BookingError("Non puoi annullare questo appuntamento.");
  if (a.status !== "booked" && a.status !== "pending_payment") throw new BookingError("L'appuntamento non è più annullabile.");

  const rules = await getRules();
  const now = new Date();
  const cutoff = new Date(a.startsAt.getTime() - rules.cancelNoticeHours * 3_600_000);
  const [pay] = await db.select().from(payments).where(eq(payments.appointmentId, a.id)).limit(1);
  let status: ApptStatus = "cancelled";
  let detail = "";

  if (a.status === "pending_payment") {
    await db.update(payments).set({ status: "failed", failureReason: "Annullato" }).where(eq(payments.appointmentId, a.id));
    detail = "Non è stato addebitato nulla.";
  } else if (a.kind === "intro") {
    detail = "Il colloquio era gratuito: nessun addebito.";
  } else if (opts.force) {
    // cambio specialista o cancellazione account: sempre rimborso completo, indipendentemente dal preavviso
    if (pay) await refundPayment(pay.id);
    detail = "Rimborso completo (o ripristino del credito).";
  } else if (bySpecialist) {
    status = "cancelled_by_specialist";
    if (pay) await refundPayment(pay.id);
    detail = "Hai diritto al rimborso completo (o al ripristino del credito).";
  } else if (now <= cutoff) {
    if (pay) await refundPayment(pay.id);
    detail = "Annullato nei termini: rimborso o credito ripristinato.";
  } else {
    status = "cancelled_late";
    detail = `Annullato con meno di ${rules.cancelNoticeHours} ore di preavviso: la seduta resta a pagamento.`;
  }

  await db.update(appointments).set({ status, cancelledAt: now, cancelledBy: actor.id }).where(eq(appointments.id, a.id));
  const [user] = await db.select().from(users).where(eq(users.id, a.userId)).limit(1);
  const [spec] = await db.select().from(users).where(eq(users.id, a.specialistId)).limit(1);
  await sendMail("appointment_cancelled", user.email, {
    name: user.fullName ?? "",
    when: fmtDateTime(a.startsAt, user.timezone),
    specialist: spec.fullName ?? "lo specialista",
    detail,
  });
  await notify(user.id, `Appuntamento del ${fmtDateTime(a.startsAt, user.timezone)} annullato. ${detail}`, "/app/appointments");
  if (!byUser) await notify(spec.id, `Appuntamento del ${fmtDateTime(a.startsAt, spec.timezone)} annullato.`, "/specialist/agenda");
  else await notify(spec.id, `L'utente ha annullato l'appuntamento del ${fmtDateTime(a.startsAt, spec.timezone)}.`, "/specialist/agenda");
  if (status === "cancelled_late") await track(a.userId, "session_late_cancel", { specialistId: a.specialistId });
  return { status, detail };
}

export async function rescheduleAppointment(apptId: string, userId: string, newStart: Date) {
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  if (!a || a.userId !== userId) throw new BookingError("Appuntamento non trovato.");
  if (a.status !== "booked") throw new BookingError("Solo gli appuntamenti confermati si possono spostare.");
  const rules = await getRules();
  if (a.kind === "session" && Date.now() > a.startsAt.getTime() - rules.cancelNoticeHours * 3_600_000) {
    throw new BookingError(`Per spostare servono almeno ${rules.cancelNoticeHours} ore di preavviso.`);
  }
  const slots = await loadSlots(a.specialistId, a.kind);
  const slot = slots.find((s) => s.startsAt.getTime() === newStart.getTime());
  if (!slot) throw new BookingError("Questo orario non è più disponibile.");
  await assertNoOverlap(userId, slot.startsAt, slot.endsAt, a.id);
  try {
    await db
      .update(appointments)
      .set({ startsAt: slot.startsAt, endsAt: slot.endsAt, reminded24: false, reminded1: false })
      .where(eq(appointments.id, a.id));
  } catch (e) {
    if (isUnique(e)) throw new BookingError("Questo orario è appena stato preso.");
    throw e;
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [spec] = await db.select().from(users).where(eq(users.id, a.specialistId)).limit(1);
  await sendMail("appointment_confirmed", user.email, {
    name: user.fullName ?? "",
    kind: a.kind === "intro" ? "colloquio gratuito" : "seduta",
    specialist: spec.fullName ?? "",
    when: fmtDateTime(slot.startsAt, user.timezone),
    link: `${env.appUrl}/app/appointments/${a.id}`,
  });
  await notify(spec.id, `L'utente ha spostato un appuntamento al ${fmtDateTime(slot.startsAt, spec.timezone)}.`, "/specialist/agenda");
}

/* ───────────────────────── dopo il colloquio / esiti ───────────────────────── */

export async function continueWithSpecialist(userId: string, specialistId: string) {
  const [rel] = await db
    .select()
    .from(careRelationships)
    .where(and(eq(careRelationships.userId, userId), eq(careRelationships.specialistId, specialistId)))
    .limit(1);
  if (!rel || !["intro_done", "active"].includes(rel.status)) throw new BookingError("Prima svolgi il colloquio gratuito.");
  await db.update(careRelationships).set({ status: "active", updatedAt: new Date() }).where(eq(careRelationships.id, rel.id));
}

/** U-10 / scenario 6: cambio gratuito, senza motivazioni obbligatorie; gli appuntamenti futuri vengono rimborsati. */
export async function changeSpecialist(userId: string, specialistId: string, reason?: string) {
  const [rel] = await db
    .select()
    .from(careRelationships)
    .where(and(eq(careRelationships.userId, userId), eq(careRelationships.specialistId, specialistId)))
    .limit(1);
  if (!rel) throw new BookingError("Percorso non trovato.");
  const future = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.specialistId, specialistId),
        gte(appointments.startsAt, new Date()),
        or(eq(appointments.status, "booked"), eq(appointments.status, "pending_payment")),
      ),
    );
  for (const f of future) await cancelAppointment(f.id, { id: userId, role: "user" }, { force: true });
  await db
    .update(careRelationships)
    .set({ status: "changed", changeReason: reason?.trim() || null, updatedAt: new Date() })
    .where(eq(careRelationships.id, rel.id));
  await track(userId, "specialist_changed", { specialistId, hadSessions: false });
}

export async function markOutcome(apptId: string, specialistId: string, outcome: "completed" | "no_show_user" | "cancelled_late", note?: string) {
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  if (!a || a.specialistId !== specialistId) throw new BookingError("Appuntamento non trovato.");
  if (a.status !== "booked") throw new BookingError("L'esito è già stato registrato.");
  const earliest = a.startsAt.getTime() - 10 * 60_000;
  if (Date.now() < earliest && process.env.DEV_ALLOW_EARLY_OUTCOME !== "1") {
    throw new BookingError("L'esito si può registrare a partire dall'inizio dell'appuntamento.");
  }
  await db.update(appointments).set({ status: outcome, outcomeNote: note?.trim() || null }).where(eq(appointments.id, a.id));

  if (a.kind === "intro" && outcome === "completed") {
    await db
      .update(careRelationships)
      .set({ status: "intro_done", updatedAt: new Date() })
      .where(and(eq(careRelationships.userId, a.userId), eq(careRelationships.specialistId, a.specialistId), ne(careRelationships.status, "active")));
    await track(a.userId, "intro_done", { specialistId: a.specialistId });
    await notify(a.userId, "Com'è andato il colloquio? Scegli se proseguire o cambiare specialista.", `/app/appointments/${a.id}`);
  }
  if (a.kind === "session") {
    if (outcome === "completed") {
      await db
        .update(careRelationships)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(careRelationships.userId, a.userId), eq(careRelationships.specialistId, a.specialistId)));
      await track(a.userId, "session_done", { specialistId: a.specialistId });
      const [{ n }] = await db
        .select({ n: count() })
        .from(appointments)
        .where(and(eq(appointments.userId, a.userId), eq(appointments.kind, "session"), eq(appointments.status, "completed")));
      if (n === T1_AFTER_SESSIONS) await notify(a.userId, "Hai fatto 4 sedute: ti chiediamo un breve check-in di benessere.", "/app/checkin");
    } else {
      await track(a.userId, outcome === "no_show_user" ? "session_no_show" : "session_late_cancel", { specialistId: a.specialistId });
    }
  }
}

/* ───────────────────────── conferme, promemoria ───────────────────────── */

export async function announceBooked(apptId: string) {
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  if (!a) return;
  if (!a.videoRoomUrl) {
    const room = await createRoom({ id: a.id, startsAt: a.startsAt, endsAt: a.endsAt });
    await db.update(appointments).set({ videoProvider: room.provider, videoRoomUrl: room.roomUrl, videoHostUrl: room.hostUrl }).where(eq(appointments.id, a.id));
  }
  const [user] = await db.select().from(users).where(eq(users.id, a.userId)).limit(1);
  const [spec] = await db.select().from(users).where(eq(users.id, a.specialistId)).limit(1);
  const kind = a.kind === "intro" ? "colloquio gratuito" : "seduta";
  await sendMail("appointment_confirmed", user.email, {
    name: user.fullName ?? "",
    kind,
    specialist: spec.fullName ?? "",
    when: fmtDateTime(a.startsAt, user.timezone),
    link: `${env.appUrl}/app/appointments/${a.id}`,
  });
  await notify(user.id, `Confermato: ${kind} con ${spec.fullName} il ${fmtDateTime(a.startsAt, user.timezone)}.`, `/app/appointments/${a.id}`);
  await notify(spec.id, `Nuova prenotazione: ${kind} il ${fmtDateTime(a.startsAt, spec.timezone)}.`, "/specialist/agenda");
}

/** C-10: promemoria 24 ore e 1 ora prima. Da chiamare ogni 5-10 minuti (cron). */
export async function sendReminders(now = new Date()) {
  let sent = 0;
  const w24 = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.status, "booked"), eq(appointments.reminded24, false), lte(appointments.startsAt, new Date(now.getTime() + 24 * 3_600_000)), gte(appointments.startsAt, new Date(now.getTime() + 3_600_000))));
  for (const a of w24) {
    await remind("reminder_24h", a);
    await db.update(appointments).set({ reminded24: true }).where(eq(appointments.id, a.id));
    sent++;
  }
  const w1 = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.status, "booked"), eq(appointments.reminded1, false), lte(appointments.startsAt, new Date(now.getTime() + 3_600_000)), gte(appointments.startsAt, now)));
  for (const a of w1) {
    await remind("reminder_1h", a);
    await db.update(appointments).set({ reminded1: true, reminded24: true }).where(eq(appointments.id, a.id));
    sent++;
  }
  return sent;
}

async function remind(key: "reminder_24h" | "reminder_1h", a: typeof appointments.$inferSelect) {
  const [user] = await db.select().from(users).where(eq(users.id, a.userId)).limit(1);
  const [spec] = await db.select().from(users).where(eq(users.id, a.specialistId)).limit(1);
  await sendMail(key, user.email, {
    name: user.fullName ?? "",
    kind: a.kind === "intro" ? "colloquio gratuito" : "seduta",
    specialist: spec.fullName ?? "",
    when: fmtDateTime(a.startsAt, user.timezone),
    time: fmtTime(a.startsAt, user.timezone),
    link: `${env.appUrl}/app/appointments/${a.id}`,
  });
  await notify(user.id, key === "reminder_24h" ? `Promemoria: domani alle ${fmtTime(a.startsAt, user.timezone)} con ${spec.fullName}.` : `Tra poco: appuntamento con ${spec.fullName}.`, `/app/appointments/${a.id}`);
}

export { creditBalance, expireHolds };
