import { and, eq, sql } from "drizzle-orm";
import { appointments, db, ratings } from "@/db";

/** S-12: valutazione 1-5 di un colloquio/seduta svolti. Una per appuntamento. */
export async function rateAppointment(userId: string, apptId: string, score: number) {
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.userId, userId))).limit(1);
  if (!a || a.status !== "completed") throw new Error("Puoi valutare solo appuntamenti svolti.");
  const s = Math.round(score);
  if (!(s >= 1 && s <= 5)) throw new Error("Valutazione non valida.");
  await db.insert(ratings).values({ appointmentId: apptId, userId, specialistId: a.specialistId, score: s }).onConflictDoNothing();
}

export async function ratingSummary(specialistId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)`, avg: sql<number>`coalesce(avg(score),0)` }).from(ratings).where(eq(ratings.specialistId, specialistId));
  return { n: r.n, avg: r.n ? Math.round(r.avg * 10) / 10 : null };
}
