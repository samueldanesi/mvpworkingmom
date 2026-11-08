import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { appointments, careRelationships, db, payments, payouts, specialistProfiles, users } from "@/db";

export const EDITABLE_PROFILE_FIELDS = ["title", "bio", "approach", "specializations", "languages", "gender", "ageGroups", "responseHours", "sessionMinutes", "priceCents", "weeklyCapacity", "photoUrl"] as const;

export async function getProfile(userId: string) {
  const [p] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, userId)).limit(1);
  return p ?? null;
}

/** S-09: compensi maturati (sedute svolte/addebitate non ancora pagate), in programma e già pagati. */
export async function earnings(specialistId: string) {
  const done = ["completed", "no_show_user", "cancelled_late"] as const;
  const rows = await db
    .select({ p: payments, a: appointments })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(and(eq(payments.specialistId, specialistId), inArray(payments.status, ["paid", "partially_refunded"])));
  let accrued = { gross: 0, fee: 0, net: 0, n: 0 };
  let upcoming = { net: 0, n: 0 };
  const lines = [];
  for (const { p, a } of rows) {
    if ((done as readonly string[]).includes(a.status) && !p.payoutId) {
      accrued = { gross: accrued.gross + (p.amountCents - p.refundedCents), fee: accrued.fee + p.feeCents, net: accrued.net + p.specialistNetCents, n: accrued.n + 1 };
    } else if (a.status === "booked") {
      upcoming = { net: upcoming.net + p.specialistNetCents, n: upcoming.n + 1 };
    }
    lines.push({ payment: p, appointment: a });
  }
  lines.sort((x, y) => y.appointment.startsAt.getTime() - x.appointment.startsAt.getTime());
  const paid = await db.select().from(payouts).where(eq(payouts.specialistId, specialistId)).orderBy(desc(payouts.createdAt));
  return { accrued, upcoming, lines, payouts: paid };
}

/** S-05: solo i propri utenti, con stato del percorso. */
export async function myClients(specialistId: string) {
  return db
    .select({ rel: careRelationships, name: users.fullName })
    .from(careRelationships)
    .innerJoin(users, eq(users.id, careRelationships.userId))
    .where(and(eq(careRelationships.specialistId, specialistId), eq(users.status, "active")))
    .orderBy(desc(careRelationships.updatedAt));
}

export async function agendaFor(specialistId: string, from: Date, to: Date) {
  return db
    .select({ a: appointments, name: users.fullName })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(and(eq(appointments.specialistId, specialistId), gte(appointments.startsAt, from), lt(appointments.startsAt, to), inArray(appointments.status, ["booked", "completed", "no_show_user", "cancelled_late", "cancelled", "cancelled_by_specialist"])))
    .orderBy(appointments.startsAt);
}

export const _s = sql;
