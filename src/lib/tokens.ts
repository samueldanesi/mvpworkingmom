import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, db } from "@/db";
import { randomToken, sha256 } from "./crypto";

export async function createAuthToken(userId: string, kind: "verify" | "reset", ttlHours: number) {
  const raw = randomToken();
  await db.insert(authTokens).values({ userId, kind, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlHours * 3_600_000) });
  return raw;
}

export async function findValidToken(raw: string, kind: "verify" | "reset") {
  const [t] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, sha256(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return t ?? null;
}

export async function consumeToken(id: string) {
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, id));
}
