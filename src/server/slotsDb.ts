import { and, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { appointments, availabilityExceptions, availabilityRules, db, payments, specialistProfiles, users } from "@/db";
import { env } from "@/lib/env";
import { generateSlots, weekKey } from "@/lib/slots";

/** Gli slot in attesa di pagamento scaduti tornano liberi (la seduta non resta confermata senza incasso). */
export async function expireHolds() {
  const now = new Date();
  const expired = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.status, "pending_payment"), lt(appointments.holdUntil, now)));
  if (!expired.length) return;
  const ids = expired.map((e) => e.id);
  await db.update(appointments).set({ status: "cancelled", cancelledAt: now }).where(inArray(appointments.id, ids));
  await db
    .update(payments)
    .set({ status: "failed", failureReason: "Tempo scaduto" })
    .where(and(inArray(payments.appointmentId, ids), eq(payments.status, "pending")));
}

export async function loadSlots(specialistId: string, kind: "intro" | "session", opts: { days?: number; from?: Date } = {}) {
  await expireHolds();
  const [prof] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, specialistId)).limit(1);
  const [spec] = await db.select({ tz: users.timezone }).from(users).where(eq(users.id, specialistId)).limit(1);
  if (!prof || !spec) return [];
  const now = new Date();
  const rules = await db.select().from(availabilityRules).where(eq(availabilityRules.specialistId, specialistId));
  const exceptions = await db.select().from(availabilityExceptions).where(eq(availabilityExceptions.specialistId, specialistId));
  const active = await db
    .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.specialistId, specialistId),
        or(eq(appointments.status, "booked"), eq(appointments.status, "pending_payment")),
        gt(appointments.endsAt, now),
      ),
    );
  const weeklyBooked: Record<string, number> = {};
  for (const a of active) {
    const k = weekKey(DateTime.fromJSDate(a.startsAt).setZone(spec.tz));
    weeklyBooked[k] = (weeklyBooked[k] ?? 0) + 1;
  }
  return generateSlots({
    rules,
    kind,
    durationMin: kind === "intro" ? env.introMinutes : prof.sessionMinutes,
    tz: spec.tz,
    from: opts.from ?? now,
    days: opts.days ?? 21,
    busy: active,
    offDays: exceptions.map((e) => e.day),
    leadHours: 6,
    now,
    weeklyCapacity: prof.weeklyCapacity,
    weeklyBooked,
  });
}

export async function nextSlot(specialistId: string, kind: "intro" | "session" = "intro") {
  const slots = await loadSlots(specialistId, kind, { days: 28 });
  return slots[0]?.startsAt ?? null;
}

export const _sql = sql;
