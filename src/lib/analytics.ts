import { eq, sql } from "drizzle-orm";
import { db, events, pseudonymMap, responses, subjects } from "@/db";
import { newPseudonym } from "./crypto";

/**
 * D-01: l'archivio analitico non contiene nome né contatti. Il collegamento utente -> pseudonimo
 * vive nello schema "keys", separato.
 */
export async function pseudonymFor(userId: string): Promise<string> {
  const [row] = await db.select().from(pseudonymMap).where(eq(pseudonymMap.userId, userId)).limit(1);
  if (row) return row.pseudonym;
  const pseudonym = newPseudonym();
  await db.insert(pseudonymMap).values({ userId, pseudonym }).onConflictDoNothing();
  const [again] = await db.select().from(pseudonymMap).where(eq(pseudonymMap.userId, userId)).limit(1);
  return again.pseudonym;
}

export async function ensureSubject(
  userId: string,
  attrs: Partial<typeof subjects.$inferInsert> = {},
): Promise<string> {
  const pseudonym = await pseudonymFor(userId);
  const defined = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined));
  const q = db.insert(subjects).values({ pseudonym, ...attrs });
  if (Object.keys(defined).length === 0) await q.onConflictDoNothing();
  else await q.onConflictDoUpdate({ target: subjects.pseudonym, set: defined });
  return pseudonym;
}

export async function track(userId: string, type: string, meta: Record<string, unknown> = {}) {
  const pseudonym = await pseudonymFor(userId);
  await db.insert(events).values({ pseudonym, type, meta });
}

export async function recordResponse(
  userId: string,
  r: { instrument: string; version: string; moment: string; score: number | null; items: Record<string, number> },
) {
  const pseudonym = await pseudonymFor(userId);
  await db.insert(responses).values({ pseudonym, ...r });
}

export function ageBand(birthYear?: number | null): string | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  if (age < 30) return "<30";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  return "50+";
}

export const _sql = sql;
