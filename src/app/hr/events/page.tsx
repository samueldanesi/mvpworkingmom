import { asc, eq } from "drizzle-orm";
import { bookEventAction } from "@/app/actions/hr";
import { Badge, Button, Card, Empty, PageHeader, Sp } from "@/components/ui";
import { db, eventBookings, trainingEvents } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireHr } from "@/lib/hr";

export const metadata = { title: "Eventi e formazione" };
const TOPIC: Record<string, string> = { genitorialita: "Genitorialità", carico_di_cura: "Carico di cura", rientro_maternita: "Rientro dalla maternità" };

/** B-11: calendario di talk e workshop tematici prenotabili dall'azienda. */
export default async function Events({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const evs = await db.select().from(trainingEvents).orderBy(asc(trainingEvents.startsAt));
  const mine = new Set((await db.select().from(eventBookings).where(eq(eventBookings.companyId, co.id))).map((b) => b.eventId));
  return (
    <>
      <PageHeader title="Eventi e formazione" subtitle="Talk e workshop tematici che puoi prenotare per la tua azienda." />
      <Sp sp={sp} />
      {evs.length === 0 ? <Empty>Nessun evento in calendario.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {evs.map((e) => (
            <Card key={e.id} className="space-y-3">
              <div className="flex items-center justify-between"><Badge tone="brand">{TOPIC[e.topic] ?? e.topic}</Badge>{mine.has(e.id) && <Badge tone="green">Prenotato</Badge>}</div>
              <h2>{e.title}</h2>
              <p className="text-sm text-ink-600">{e.description}</p>
              <p className="text-sm text-ink-500">{fmtDateTime(e.startsAt)} · {e.durationMin} minuti</p>
              <form action={bookEventAction}>
                <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="op" value={mine.has(e.id) ? "cancel" : "book"} />
                <Button variant={mine.has(e.id) ? "secondary" : "primary"}>{mine.has(e.id) ? "Annulla prenotazione" : "Prenota per la mia azienda"}</Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
