import { notFound } from "next/navigation";
import { eq, and, or } from "drizzle-orm";
import { CallRoom } from "@/components/CallRoom";
import { Notice, PageHeader } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { appointments, db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { navFor } from "@/lib/nav";

export const dynamic = "force-dynamic";

/** Accessibile solo a utente e specialista dell'appuntamento, da 15 minuti prima a 15 minuti dopo. */
export default async function Call({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser({ roles: ["user", "specialist"] });
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, id), or(eq(appointments.userId, u.id), eq(appointments.specialistId, u.id)))).limit(1);
  if (!a || a.status !== "booked") notFound();
  const now = Date.now();
  const early = now < a.startsAt.getTime() - 15 * 60_000;
  const late = now > a.endsAt.getTime() + 15 * 60_000;
  const [other] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, u.role === "specialist" ? a.userId : a.specialistId)).limit(1);
  const isSpec = u.role === "specialist";
  return (
    <Shell user={u} nav={navFor(u.role)}>
      <PageHeader title="Videochiamata" subtitle={`${a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} · ${fmtDateTime(a.startsAt, u.timezone)}`} />
      {early || late ? (
        <Notice>{early ? "La stanza si apre 15 minuti prima dell'inizio." : "La stanza è chiusa: l'appuntamento è terminato."}</Notice>
      ) : (
        <CallRoom provider={a.videoProvider ?? "mock"} roomUrl={(isSpec ? a.videoHostUrl : a.videoRoomUrl) ?? ""} label={`Stai per entrare con ${isSpec ? "l'utente" : other?.name}. L'appuntamento non viene registrato.`} />
      )}
    </Shell>
  );
}
