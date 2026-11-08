import { eq } from "drizzle-orm";
import { attachments, db, messages, threads } from "@/db";
import { getUser } from "@/lib/auth";
import { readEncrypted } from "@/lib/storage";

/** Allegati di chat: li scarica solo uno dei due partecipanti della conversazione. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Non autorizzato", { status: 401 });
  const { id } = await params;
  const [row] = await db
    .select({ a: attachments, t: threads })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .innerJoin(threads, eq(threads.id, messages.threadId))
    .where(eq(attachments.id, id))
    .limit(1);
  if (!row || (row.t.userId !== u.id && row.t.specialistId !== u.id)) return new Response("Non trovato", { status: 404 });
  const buf = await readEncrypted(row.a.storageKey);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": row.a.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.a.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
