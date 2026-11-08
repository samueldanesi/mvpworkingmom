import { eq } from "drizzle-orm";
import { db, specialistDocuments } from "@/db";
import { audit } from "@/lib/audit";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { readEncrypted } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Non autorizzato", { status: 401 });
  const { id } = await params;
  const [d] = await db.select().from(specialistDocuments).where(eq(specialistDocuments.id, id)).limit(1);
  const ok = d && (d.specialistId === u.id || can(u.role, "specialists.review"));
  if (!d || !ok) return new Response("Non trovato", { status: 404 });
  if (d.specialistId !== u.id) await audit(u, "view_specialist_document", "document", d.id, "valutazione candidatura");
  return new Response(new Uint8Array(await readEncrypted(d.storageKey)), { headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
