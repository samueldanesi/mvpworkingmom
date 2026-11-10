import { and, eq, inArray, sql } from "drizzle-orm";
import { Card, Notice, PageHeader, Stat } from "@/components/ui";
import { appointments, careRelationships, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { ratingSummary } from "@/server/ratings";

export const metadata = { title: "Valutazioni" };
const MIN = 5;

/** S-12: dati aggregati (niente commenti liberi nell'MVP). Sotto soglia non si mostra nulla. */
export default async function Ratings() {
  const u = await requireUser({ roles: ["specialist"] });
  const [r] = await db
    .select({
      introDone: sql<number>`count(*) filter (where status in ('intro_done','active','interrupted','ended','changed'))`,
      active: sql<number>`count(*) filter (where status = 'active')`,
      changed: sql<number>`count(*) filter (where status = 'changed')`,
    })
    .from(careRelationships)
    .where(eq(careRelationships.specialistId, u.id));
  const [s] = await db
    .select({ n: sql<number>`count(*)` })
    .from(appointments)
    .where(and(eq(appointments.specialistId, u.id), eq(appointments.kind, "session"), inArray(appointments.status, ["completed"])));
  const sat = await ratingSummary(u.id);
  const enough = r.introDone >= MIN;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  return (
    <>
      <PageHeader title="Valutazioni" subtitle="Dati aggregati che alimentano il matching e la supervisione." />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Soddisfazione media" value={sat.n >= MIN ? `${sat.avg}/5` : "n.d."} hint={sat.n >= MIN ? `${sat.n} valutazioni` : `Servono almeno ${MIN} valutazioni`} />
        <Stat label="Sedute svolte" value={s.n} />
        <Stat label="Prosecuzione dopo il colloquio" value={enough ? pct(r.active, r.introDone) : "n.d."} hint={enough ? `${r.active} su ${r.introDone}` : `Servono almeno ${MIN} colloqui`} />
        <Stat label="Cambio specialista" value={enough ? pct(r.changed, r.introDone) : "n.d."} />
      </div>
      <Card className="mt-6"><Notice tone="blue">Nessun commento libero e nessun dato individuale: solo percentuali, mostrate solo sopra una soglia minima.</Notice></Card>
    </>
  );
}
