import Link from "next/link";
import { and, asc, eq, gte, or } from "drizzle-orm";
import { Badge, Card, Empty, LinkButton, PageHeader, Sp } from "@/components/ui";
import { appointments, careRelationships, companies, db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { creditBalance } from "@/server/codes";
import { dueCheckins } from "@/server/checkin";

export default async function UserHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const upcoming = await db
    .select({ a: appointments, name: users.fullName })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.specialistId))
    .where(and(eq(appointments.userId, u.id), gte(appointments.endsAt, new Date()), or(eq(appointments.status, "booked"), eq(appointments.status, "pending_payment"))))
    .orderBy(asc(appointments.startsAt))
    .limit(3);
  const rels = await db.select().from(careRelationships).where(eq(careRelationships.userId, u.id));
  const credits = await creditBalance(u.id);
  const [co] = u.companyId ? await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
  const due = await dueCheckins(u.id);
  const activeRel = rels.find((r) => r.status === "active" || r.status === "intro_done");

  return (
    <>
      <PageHeader title={`Ciao ${u.fullName?.split(" ")[0] ?? ""}`} subtitle="Ecco il tuo spazio." />
      <Sp sp={sp} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 space-y-3">
          <h2>Prossimi appuntamenti</h2>
          {upcoming.length === 0 ? (
            <Empty>Nessun appuntamento in programma.</Empty>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map(({ a, name }) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <Link href={`/app/appointments/${a.id}`}>{fmtDateTime(a.startsAt, u.timezone)}</Link> · {a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} con {name}
                  </span>
                  {a.status === "pending_payment" && <Badge tone="amber">Da pagare</Badge>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {activeRel ? (
              <LinkButton href={`/app/book/${activeRel.specialistId}?kind=session`}>Prenota una seduta</LinkButton>
            ) : (
              <LinkButton href="/app/matching">Trova il tuo specialista</LinkButton>
            )}
            <LinkButton href="/app/appointments" variant="secondary">Tutti gli appuntamenti</LinkButton>
          </div>
        </Card>
        <div className="space-y-4">
          {co && (
            <Card className="space-y-1">
              <h2>Il tuo programma</h2>
              <p className="text-sm text-ink-600">{co.name}</p>
              {u.coverageKind === "employee" && (
                <p className="text-sm">
                  <strong>{credits}</strong> sedute incluse residue
                </p>
              )}
              {u.coverageKind === "employee" && co.familyMax > 0 && <Link href="/app/settings" className="text-sm">Invita un familiare</Link>}
            </Card>
          )}
          {due.length > 0 && (
            <Card className="space-y-2">
              <h2>Check-in</h2>
              <p className="text-sm text-ink-600">Hai un breve questionario da compilare.</p>
              <LinkButton href="/app/checkin" variant="secondary">Compila</LinkButton>
            </Card>
          )}
          <Card className="space-y-1 text-sm text-ink-600">
            <h2>Hai bisogno di aiuto urgente?</h2>
            <p>La chat non è un canale di emergenza.</p>
            <Link href="/emergency">Numeri di emergenza</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
