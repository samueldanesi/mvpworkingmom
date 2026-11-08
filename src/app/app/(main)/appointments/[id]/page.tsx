import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cancelAppointmentAction, changeSpecialistAction, continueAction, rescheduleAction } from "@/app/actions/booking";
import { SlotPicker } from "@/components/SlotPicker";
import { Badge, Button, Card, Field, LinkButton, Notice, PageHeader, Sp, str } from "@/components/ui";
import { appointments, careRelationships, db, payments, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { eur, fmtDateTime } from "@/lib/format";
import { getRules } from "@/server/settings";
import { loadSlots } from "@/server/slotsDb";
import { STATUS_LABEL } from "@/lib/status";

export default async function AppointmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, u.id))).limit(1);
  if (!a) notFound();
  const [spec] = await db.select().from(users).where(eq(users.id, a.specialistId)).limit(1);
  const [pay] = await db.select().from(payments).where(eq(payments.appointmentId, a.id)).limit(1);
  const [rel] = await db.select().from(careRelationships).where(and(eq(careRelationships.userId, u.id), eq(careRelationships.specialistId, a.specialistId))).limit(1);
  const rules = await getRules();
  const [label, tone] = STATUS_LABEL[a.status];
  const now = Date.now();
  const canJoin = a.status === "booked" && now >= a.startsAt.getTime() - 15 * 60_000 && now <= a.endsAt.getTime() + 15 * 60_000;
  const cutoff = a.startsAt.getTime() - rules.cancelNoticeHours * 3_600_000;
  const beforeCutoff = now <= cutoff || a.kind === "intro";
  const slots = str(sp.reschedule) === "1" && a.status === "booked" && beforeCutoff ? await loadSlots(a.specialistId, a.kind) : null;

  return (
    <>
      <PageHeader title={a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} subtitle={`${fmtDateTime(a.startsAt, u.timezone)} · con ${spec.fullName}`} actions={<Badge tone={tone}>{label}</Badge>} />
      <Sp sp={sp} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-4 md:col-span-2">
          {a.status === "pending_payment" && pay && (
            <Notice>
              Slot riservato fino alle {a.holdUntil ? fmtDateTime(a.holdUntil, u.timezone) : ""}. <a href={`/app/pay?ids=${pay.id}`}>Completa il pagamento</a>.
            </Notice>
          )}
          {a.status === "booked" && (
            <div className="flex flex-wrap gap-2">
              {canJoin ? <LinkButton href={`/call/${a.id}`}>Entra nella videochiamata</LinkButton> : <p className="text-sm text-ink-600">Il link di accesso si attiva 15 minuti prima dell&apos;inizio.</p>}
              <LinkButton href={`/api/appointments/${a.id}/ics`} variant="secondary">Aggiungi al calendario (.ics)</LinkButton>
            </div>
          )}
          {a.status === "completed" && a.kind === "intro" && rel && ["intro_done", "active"].includes(rel.status) && (
            <div className="space-y-3 rounded-xl bg-brand-50 p-4">
              <h3>Com&apos;è andata?</h3>
              <p className="text-sm text-ink-700">Scegli come proseguire. Cambiare specialista è gratuito e non serve spiegare perché.</p>
              <div className="flex flex-wrap gap-2">
                <form action={continueAction}>
                  <input type="hidden" name="specialistId" value={a.specialistId} />
                  <Button>Prosegui con questo specialista</Button>
                </form>
                <form action={changeSpecialistAction} className="flex items-center gap-2">
                  <input type="hidden" name="specialistId" value={a.specialistId} />
                  <Button variant="secondary">Cambia specialista</Button>
                </form>
              </div>
            </div>
          )}
          {a.status === "booked" && (
            <div className="space-y-3 border-t border-ink-100 pt-4">
              <h3>Gestisci</h3>
              <p className="text-sm text-ink-600">
                {a.kind === "intro"
                  ? "Puoi spostare o annullare il colloquio gratuito quando vuoi."
                  : beforeCutoff
                    ? `Puoi spostare o disdire senza costi fino a ${rules.cancelNoticeHours} ore prima (entro ${fmtDateTime(new Date(cutoff), u.timezone)}).`
                    : `Mancano meno di ${rules.cancelNoticeHours} ore: la seduta non è più spostabile e, se annulli, resta a pagamento.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {beforeCutoff && <LinkButton href={`/app/appointments/${a.id}?reschedule=1`} variant="secondary">Sposta</LinkButton>}
                <form action={cancelAppointmentAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button variant="danger">Annulla appuntamento</Button>
                </form>
              </div>
            </div>
          )}
          {slots && (
            <form action={rescheduleAction} className="space-y-3 border-t border-ink-100 pt-4">
              <input type="hidden" name="id" value={a.id} />
              <h3>Scegli un nuovo orario</h3>
              <SlotPicker slots={slots} tz={u.timezone} />
              <Button>Conferma nuovo orario</Button>
            </form>
          )}
        </Card>
        <Card className="space-y-2 text-sm">
          <h3>Dettagli</h3>
          <p className="text-ink-600">Specialista: {spec.fullName}</p>
          {pay && (
            <p className="text-ink-600">
              {pay.source === "company_credit" ? "Coperta da un credito del tuo programma" : `Importo: ${eur(pay.amountCents)}${pay.refundedCents ? ` (rimborsati ${eur(pay.refundedCents)})` : ""}`}
            </p>
          )}
          {pay?.source === "personal" && pay.status !== "pending" && pay.status !== "failed" && <a href="/app/invoices">Vai alle fatture</a>}
        </Card>
      </div>
    </>
  );
}
