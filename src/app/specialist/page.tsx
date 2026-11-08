import Link from "next/link";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { acceptContractAction } from "@/app/actions/specialist";
import { Badge, Button, Card, Empty, LinkButton, Notice, PageHeader, Sp, Stat } from "@/components/ui";
import { appointments, availabilityRules, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { eur, fmtTime } from "@/lib/format";
import { agendaFor, earnings } from "@/server/specialist";
import { specialistState } from "@/server/specialistGate";

const STATUS: Record<string, [string, "gray" | "green" | "amber" | "red"]> = {
  received: ["Candidatura ricevuta", "gray"],
  reviewing: ["In valutazione", "amber"],
  interview: ["Colloquio", "amber"],
  approved: ["Approvata", "green"],
  rejected: ["Non approvata", "red"],
  suspended: ["Sospeso", "red"],
};

export default async function SpecialistHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const st = await specialistState(u.id);
  if (!st.profile) return <Empty>Profilo non trovato.</Empty>;

  if (st.profile.status !== "approved") {
    const [label, tone] = STATUS[st.profile.status];
    return (
      <>
        <PageHeader title="La tua candidatura" />
        <Card className="space-y-2">
          <Badge tone={tone}>{label}</Badge>
          <p className="text-sm text-ink-600">Ti scriveremo via email a ogni passaggio. L&apos;approvazione è manuale, a cura del responsabile clinico.</p>
          {st.profile.statusNote && <p className="text-sm">Nota: {st.profile.statusNote}</p>}
        </Card>
      </>
    );
  }
  if (!st.accepted) {
    return (
      <>
        <PageHeader title="Benvenuta/o in Working Mom" subtitle="Ultimo passo prima di iniziare." />
        <Sp sp={sp} />
        <Card className="space-y-4">
          <p className="text-sm text-ink-700">Per attivare il tuo spazio di lavoro accetta il contratto di collaborazione, il codice di condotta e l&apos;informativa privacy. L&apos;accettazione viene registrata con data e versione.</p>
          <form action={acceptContractAction} className="space-y-3">
            {[["contract", "Ho letto e accetto il contratto di collaborazione (testo definitivo a cura della Committente)"], ["conduct", "Accetto il codice di condotta, incluso il protocollo di emergenza"], ["privacy", "Ho letto l'informativa privacy per i professionisti"]].map(([n, l]) => (
              <label key={n} className="flex items-start gap-2 text-sm font-normal"><input type="checkbox" name={n} className="mt-1" />{l}</label>
            ))}
            <Button>Accetta e continua</Button>
          </form>
        </Card>
      </>
    );
  }

  const now = new Date();
  const dayEnd = new Date(now.getTime() + 24 * 3_600_000);
  const today = await agendaFor(u.id, new Date(now.getTime() - 3 * 3_600_000), dayEnd);
  const [{ n: rules }] = await db.select({ n: count() }).from(availabilityRules).where(eq(availabilityRules.specialistId, u.id));
  const [{ n: upcoming }] = await db.select({ n: count() }).from(appointments).where(and(eq(appointments.specialistId, u.id), eq(appointments.status, "booked"), gte(appointments.startsAt, now)));
  const [{ n: toClose }] = await db.select({ n: count() }).from(appointments).where(and(eq(appointments.specialistId, u.id), eq(appointments.status, "booked"), lt(appointments.endsAt, now)));
  const e = await earnings(u.id);

  return (
    <>
      <PageHeader title={`Ciao ${u.fullName?.split(" ")[0] ?? ""}`} />
      <Sp sp={sp} />
      <div className="space-y-4">
        {rules === 0 && <Notice>Non hai ancora inserito le tue disponibilità: finché non lo fai nessuno può prenotarti. <Link href="/specialist/agenda">Vai all&apos;agenda</Link></Notice>}
        {!st.profile.published && <Notice tone="blue">Il tuo profilo non è ancora pubblicato.</Notice>}
        {st.profile.pendingChanges && <Notice tone="blue">Hai modifiche al profilo in attesa di approvazione.</Notice>}
        {toClose > 0 && <Notice tone="red">Hai {toClose} appuntamenti passati senza esito registrato: <Link href="/specialist/agenda">registrali</Link> per far maturare i compensi.</Notice>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Appuntamenti futuri" value={upcoming} />
          <Stat label="Compensi maturati" value={eur(e.accrued.net)} hint={`${e.accrued.n} sedute, già al netto della commissione`} />
          <Stat label="In programma" value={eur(e.upcoming.net)} hint={`${e.upcoming.n} sedute confermate`} />
        </div>
        <Card className="space-y-3">
          <h2>Oggi</h2>
          {today.length === 0 ? <Empty>Nessun appuntamento oggi.</Empty> : (
            <ul className="divide-y divide-ink-100 text-sm">
              {today.map(({ a, name }) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span><Link href={`/specialist/appointments/${a.id}`}>{fmtTime(a.startsAt, u.timezone)}</Link> · {a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} con {name}</span>
                  <Badge tone={a.status === "booked" ? "green" : "gray"}>{a.status === "booked" ? "Confermato" : a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
          <LinkButton href="/specialist/agenda" variant="secondary">Apri agenda</LinkButton>
        </Card>
      </div>
    </>
  );
}
