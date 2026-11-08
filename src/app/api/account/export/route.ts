import { db, gdprRequests } from "@/db";
import { getUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { exportUserData } from "@/server/gdpr";

export async function GET() {
  const u = await getUser();
  if (!u || u.role !== "user") return new Response("Non autorizzato", { status: 401 });
  const data = await exportUserData(u.id);
  await db.insert(gdprRequests).values({ userId: u.id, userEmail: u.email, kind: "export", status: "done", dueAt: new Date(), closedAt: new Date(), note: "Self-service" });
  await audit(u, "data_export", "user", u.id);
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="i-miei-dati.json"', "Cache-Control": "private, no-store" } });
}
