import { eq } from "drizzle-orm";
import { db, settings } from "@/db";
import { env } from "@/lib/env";

export type BusinessRules = { cancelNoticeHours: number; platformFeePct: number; kMin: number };

/** U-11 / S-09 / D-05: regole configurabili dal backoffice, con default da variabili d'ambiente. */
export async function getRules(): Promise<BusinessRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "business_rules")).limit(1);
  const v = (row?.value ?? {}) as Partial<BusinessRules>;
  return {
    cancelNoticeHours: v.cancelNoticeHours ?? env.cancelNoticeHours,
    platformFeePct: v.platformFeePct ?? env.platformFeePct,
    kMin: v.kMin ?? env.kMin,
  };
}

export async function setRules(r: BusinessRules) {
  await db
    .insert(settings)
    .values({ key: "business_rules", value: r })
    .onConflictDoUpdate({ target: settings.key, set: { value: r } });
}
