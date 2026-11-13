import { eq } from "drizzle-orm";
import { db, specialistProfiles } from "@/db";
import { getUser } from "@/lib/auth";
import { readEncrypted } from "@/lib/storage";

/** S-03 / U-07: foto del profilo pubblico. Si serve solo quella pubblicata (approvata); il proprietario vede anche quella in attesa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, id)).limit(1);
  if (!p) return new Response("Non trovato", { status: 404 });
  const u = await getUser();
  const pending = (p.pendingChanges as { photoUrl?: string | null } | null)?.photoUrl;
  const key = u?.id === id ? (pending ?? p.photoUrl) : p.published ? p.photoUrl : null;
  if (!key) return new Response("Non trovato", { status: 404 });
  const buf = await readEncrypted(key).catch(() => null);
  if (!buf) return new Response("Non trovato", { status: 404 });
  const type = buf[0] === 0x89 ? "image/png" : buf[0] === 0xff ? "image/jpeg" : "image/webp";
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
