import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, Empty, PageHeader, Sp } from "@/components/ui";
import { appointments, db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";

export default async function Appointments({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const rows = await db
    .select({ a: appointments, name: users.fullName })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.specialistId))
    .where(eq(appointments.userId, u.id))
    .orderBy(desc(appointments.startsAt));
  const now = Date.now();
  const future = rows.filter((r) => r.a.endsAt.getTime() >= now && ["booked", "pending_payment"].includes(r.a.status)).reverse();
  const past = rows.filter((r) => !future.includes(r));
  const list = (items: typeof rows) => (
    <div className="space-y-2">
      {items.map(({ a, name }) => {
        const [label, tone] = STATUS_LABEL[a.status];
        return (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <Link href={`/app/appointments/${a.id}`} className="font-medium">{fmtDateTime(a.startsAt, u.timezone)}</Link>
              <p className="text-ink-500">{a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} con {name}</p>
            </div>
            <Badge tone={tone}>{label}</Badge>
          </Card>
        );
      })}
    </div>
  );
  return (
    <>
      <PageHeader title="Appuntamenti" />
      <Sp sp={sp} />
      <h2 className="mb-2">Prossimi</h2>
      {future.length ? list(future) : <Empty>Nessun appuntamento in programma.</Empty>}
      <h2 className="mb-2 mt-8">Passati e annullati</h2>
      {past.length ? list(past) : <Empty>Ancora nulla.</Empty>}
    </>
  );
}
