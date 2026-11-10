import { mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { sqlClient } from "@/db";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { attachments, authTokens, companies, creditLedger, db, emailOutbox, integrationLog, messages, notifications, sessionNotes, settings } from "@/db";

/** B-05: i crediti non usati di un'azienda con contratto terminato scadono (riga "expire" nel registro). */
export async function expireCredits(now = new Date()) {
  const cos = await db.select().from(companies).where(and(isNotNull(companies.endsAt), lt(companies.endsAt, now)));
  let expired = 0;
  for (const c of cos) {
    const rows = await db
      .select({ userId: creditLedger.userId, bal: sql<number>`sum(${creditLedger.delta})` })
      .from(creditLedger)
      .where(eq(creditLedger.companyId, c.id))
      .groupBy(creditLedger.userId);
    for (const r of rows) {
      if (r.userId && r.bal > 0) {
        await db.insert(creditLedger).values({ companyId: c.id, userId: r.userId, delta: -r.bal, reason: "expire", note: "Contratto scaduto" });
        expired += r.bal;
      }
    }
  }
  return expired;
}

/** D-08: tempi di conservazione per archivio. Valori di partenza da concordare col DPO; modificabili da /admin/settings. */
export type Retention = { outboxDays: number; notificationsDays: number; logsDays: number; clinicalDays: number };
export const DEFAULT_RETENTION: Retention = { outboxDays: 365, notificationsDays: 180, logsDays: 365, clinicalDays: 3650 };

export async function getRetention(): Promise<Retention> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "retention")).limit(1);
  return { ...DEFAULT_RETENTION, ...((row?.value ?? {}) as Partial<Retention>) };
}
export async function setRetention(r: Retention) {
  await db.insert(settings).values({ key: "retention", value: r }).onConflictDoUpdate({ target: settings.key, set: { value: r } });
}

export async function runRetention(now = new Date()) {
  const r = await getRetention();
  const before = (d: number) => new Date(now.getTime() - d * 86_400_000);
  const out = { email: 0, notifications: 0, tokens: 0, logs: 0, messages: 0, notes: 0 };
  out.email = (await db.delete(emailOutbox).where(lt(emailOutbox.createdAt, before(r.outboxDays))).returning({ id: emailOutbox.id })).length;
  out.notifications = (await db.delete(notifications).where(lt(notifications.createdAt, before(r.notificationsDays))).returning({ id: notifications.id })).length;
  out.tokens = (await db.delete(authTokens).where(lt(authTokens.expiresAt, now)).returning({ id: authTokens.id })).length;
  out.logs = (await db.delete(integrationLog).where(lt(integrationLog.createdAt, before(r.logsDays))).returning({ id: integrationLog.id })).length;
  const oldMsgs = await db.select({ id: messages.id }).from(messages).where(lt(messages.createdAt, before(r.clinicalDays)));
  if (oldMsgs.length) {
    const ids = oldMsgs.map((m) => m.id);
    await db.delete(attachments).where(inArray(attachments.messageId, ids));
    await db.delete(messages).where(inArray(messages.id, ids));
    out.messages = ids.length;
  }
  out.notes = (await db.delete(sessionNotes).where(and(lt(sessionNotes.createdAt, before(r.clinicalDays)), eq(sessionNotes.retained, false))).returning({ id: sessionNotes.id })).length;
  return out;
}

/** T-12: copia di sicurezza del database (SQLite: VACUUM INTO) e prova di ripristino su una copia temporanea. */

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export async function createBackup() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `wm-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  await sqlClient.execute(`VACUUM INTO '${path.join(BACKUP_DIR, name).replace(/'/g, "''")}'`);
  return name;
}

export function listBackups() {
  try {
    return readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db")).sort().reverse().map((f) => ({ name: f, sizeKb: Math.round(statSync(path.join(BACKUP_DIR, f)).size / 1024) }));
  } catch {
    return [];
  }
}

/** Prova di ripristino: apre la copia e controlla che i dati essenziali ci siano. */
export async function verifyBackup(name: string) {
  if (!/^wm-[\w-]+\.db$/.test(name)) throw new Error("Copia non valida.");
  const c = createClient({ url: `file:${path.join(BACKUP_DIR, name)}` });
  try {
    const u = await c.execute("select count(*) as n from users");
    const a = await c.execute("select count(*) as n from appointments");
    return { users: Number(u.rows[0].n), appointments: Number(a.rows[0].n) };
  } finally {
    c.close();
  }
}
