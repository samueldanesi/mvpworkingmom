import { and, eq, sql } from "drizzle-orm";
import { consents, db, intakeProfiles, safetyEvents, users } from "@/db";
import { ageBand, ensureSubject, track } from "@/lib/analytics";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { detectAlarm } from "@/lib/safety";

/** U-04: questionario d'ingresso a schermate brevi con salvataggio parziale. I dati sono cifrati (P-05). */
export type IntakeData = {
  area?: string;
  notes?: string;
  childrenCount?: number;
  childAgeGroups?: string[];
  language?: string;
  gender?: "any" | "f" | "m";
  times?: string[];
  previousTherapy?: "yes" | "no";
  risk1?: "yes" | "no";
  risk2?: "yes" | "no";
};

export const INTAKE_STEPS = 5;

export async function getIntake(userId: string): Promise<{ data: IntakeData; step: number; completed: boolean; safetyFlag: boolean }> {
  const [row] = await db.select().from(intakeProfiles).where(eq(intakeProfiles.userId, userId)).limit(1);
  if (!row) return { data: {}, step: 0, completed: false, safetyFlag: false };
  return { data: decryptJson<IntakeData>(row.dataEnc), step: row.step, completed: !!row.completedAt, safetyFlag: row.safetyFlag };
}

export async function saveIntakeStep(userId: string, stepIndex: number, patch: Partial<IntakeData>): Promise<{ safety: boolean; completed: boolean }> {
  const cur = await getIntake(userId);
  const data = { ...cur.data, ...patch };
  const step = Math.max(cur.step, stepIndex + 1);
  const last = stepIndex >= INTAKE_STEPS - 1;

  let safety = cur.safetyFlag;
  let trigger: string | null = null;
  if (data.risk1 === "yes" || data.risk2 === "yes") trigger = "risposta";
  else trigger = detectAlarm(data.notes);
  if (trigger) safety = true;

  const values = {
    userId,
    dataEnc: encryptJson(data),
    step,
    safetyFlag: safety,
    completedAt: last ? new Date() : null,
    updatedAt: new Date(),
  };
  await db.insert(intakeProfiles).values(values).onConflictDoUpdate({
    target: intakeProfiles.userId,
    set: { dataEnc: values.dataEnc, step: values.step, safetyFlag: values.safetyFlag, completedAt: last ? new Date() : sql`${intakeProfiles.completedAt}`, updatedAt: values.updatedAt },
  });
  if (trigger && !cur.safetyFlag) await db.insert(safetyEvents).values({ userId, trigger });

  if (last) {
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [agg] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(consents)
      .where(and(eq(consents.userId, userId), eq(consents.kind, "aggregate_use"), sql`${consents.revokedAt} is null`));
    await ensureSubject(userId, {
      companyId: u.companyId,
      gender: u.gender,
      ageBand: ageBand(u.birthYear),
      site: u.site,
      jobLevel: u.jobLevel,
      area: data.area ?? null,
      firstPath: data.previousTherapy === "no",
      childrenCount: data.childrenCount ?? null,
      childrenAgeBand: data.childAgeGroups?.[0] ?? null,
      consentAggregate: (agg?.n ?? 0) > 0,
    });
    await track(userId, "intake_done");
  }
  return { safety, completed: last };
}
