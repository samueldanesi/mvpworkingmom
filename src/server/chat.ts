import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { attachments, db, messages, threads, users } from "@/db";
import { decryptText, encryptText } from "@/lib/crypto";
import { checkUpload, saveEncrypted } from "@/lib/storage";
import { notify } from "./notify";

export class ChatError extends Error {}

export async function getThread(threadId: string, actorId: string) {
  const [t] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);
  if (!t || (t.userId !== actorId && t.specialistId !== actorId)) return null;
  return t;
}

/** Elenco conversazioni dell'utente o dello specialista, con ultimo messaggio decifrato e non letti. */
export async function listThreads(actorId: string, as: "user" | "specialist") {
  const rows = await db
    .select()
    .from(threads)
    .where(as === "user" ? eq(threads.userId, actorId) : eq(threads.specialistId, actorId));
  const out = [];
  for (const t of rows) {
    const otherId = as === "user" ? t.specialistId : t.userId;
    const [other] = await db.select({ id: users.id, name: users.fullName }).from(users).where(eq(users.id, otherId)).limit(1);
    const [last] = await db.select().from(messages).where(eq(messages.threadId, t.id)).orderBy(desc(messages.createdAt)).limit(1);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.threadId, t.id), ne(messages.senderId, actorId), sql`${messages.readAt} is null`));
    out.push({ thread: t, otherName: other?.name ?? "Utente", last: last ? { text: decryptText(last.bodyEnc), at: last.createdAt } : null, unread: n });
  }
  out.sort((a, b) => (b.last?.at.getTime() ?? 0) - (a.last?.at.getTime() ?? 0));
  return out;
}

export async function listMessages(threadId: string, actorId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.threadId, threadId), ne(messages.senderId, actorId), sql`${messages.readAt} is null`));
  const rows = await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt)).limit(300);
  const ids = rows.map((r) => r.id);
  const atts = ids.length ? await db.select().from(attachments).where(inArray(attachments.messageId, ids)) : [];
  return rows.map((m) => ({
    id: m.id,
    mine: m.senderId === actorId,
    text: decryptText(m.bodyEnc),
    at: m.createdAt,
    attachments: atts.filter((a) => a.messageId === m.id),
  }));
}

export async function sendMessage(threadId: string, senderId: string, text: string, files: File[]) {
  const t = await getThread(threadId, senderId);
  if (!t) throw new ChatError("Conversazione non trovata.");
  const clean = text.trim();
  if (!clean && files.length === 0) throw new ChatError("Scrivi un messaggio o allega un file.");
  if (clean.length > 4000) throw new ChatError("Messaggio troppo lungo.");
  for (const f of files) {
    const err = checkUpload(f);
    if (err) throw new ChatError(err);
  }
  const [m] = await db.insert(messages).values({ threadId, senderId, bodyEnc: encryptText(clean) }).returning();
  for (const f of files) {
    const key = await saveEncrypted(Buffer.from(await f.arrayBuffer()));
    await db.insert(attachments).values({ messageId: m.id, filename: f.name.slice(0, 120), mime: f.type, size: f.size, storageKey: key });
  }
  const otherId = senderId === t.userId ? t.specialistId : t.userId;
  await notify(otherId, "Hai un nuovo messaggio in chat.", senderId === t.userId ? `/specialist/chat/${t.id}` : `/app/chat/${t.id}`);
}
