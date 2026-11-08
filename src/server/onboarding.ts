import { and, eq, sql } from "drizzle-orm";
import { consents, db, users } from "@/db";
import { getIntake } from "./intake";
import { dueCheckins } from "./checkin";

/** Dove deve andare un utente che non ha ancora completato l'ingresso (null = tutto a posto). */
export async function nextOnboardingStep(userId: string): Promise<string | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u.onboardingPath && !u.companyId) return "/onboarding";
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.kind, "health_data"), sql`${consents.revokedAt} is null`));
  if (!c.n) return "/onboarding/consents";
  const intake = await getIntake(userId);
  if (intake.safetyFlag) return "/emergency";
  if (!intake.completed) return "/onboarding/questionnaire";
  const due = await dueCheckins(userId);
  if (due.includes("T0")) return "/onboarding/checkin";
  return null;
}
