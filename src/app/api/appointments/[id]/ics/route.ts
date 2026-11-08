import { and, eq, or } from "drizzle-orm";
import { appointments, db, users } from "@/db";
import { getUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { buildIcs } from "@/lib/ics";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Non autorizzato", { status: 401 });
  const { id } = await params;
  const [a] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), or(eq(appointments.userId, u.id), eq(appointments.specialistId, u.id))))
    .limit(1);
  if (!a) return new Response("Non trovato", { status: 404 });
  const [other] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, a.userId === u.id ? a.specialistId : a.userId)).limit(1);
  const ics = buildIcs({
    id: a.id,
    title: `${a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} Working Mom${u.role === "user" ? ` con ${other?.name}` : ""}`,
    description: "Entra dal link nella tua area Working Mom.",
    start: a.startsAt,
    end: a.endsAt,
    url: `${env.appUrl}/${u.role === "user" ? "app" : "specialist"}/appointments/${a.id}`,
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="appuntamento-${a.id.slice(0, 8)}.ics"` } });
}
