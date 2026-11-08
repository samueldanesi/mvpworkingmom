import "server-only";
import { headers } from "next/headers";
import { db, auditLog } from "@/db";

/** C-08: registra chi ha acceduto a cosa, quando e perché. */
export async function audit(
  actor: { id: string; role: string } | null,
  action: string,
  subjectType?: string,
  subjectId?: string,
  reason?: string,
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  } catch {
    /* fuori da una richiesta (script, cron) */
  }
  await db.insert(auditLog).values({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? null,
    action,
    subjectType: subjectType ?? null,
    subjectId: subjectId ?? null,
    reason: reason ?? null,
    ip,
  });
}
