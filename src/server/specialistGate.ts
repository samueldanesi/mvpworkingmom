import { and, eq, sql } from "drizzle-orm";
import { consents, db } from "@/db";
import { getProfile } from "./specialist";

export async function specialistState(userId: string) {
  const p = await getProfile(userId);
  const [c] = await db
    .select({ n: sql<number>`count(*)` })
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.kind, "specialist_contract"), sql`${consents.revokedAt} is null`));
  return { profile: p, accepted: (c?.n ?? 0) > 0, ready: !!p && p.status === "approved" && (c?.n ?? 0) > 0 };
}
