import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { outcomeAction, saveNoteAction, specialistCancelAction } from "@/app/actions/specialist";
import { Badge, Button, Card, Field, LinkButton, PageHeader, Sp } from "@/components/ui";
import { appointments, careRelationships, db, sessionNotes, threads, users } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { decryptText } from "@/lib/crypto";
import { fmtDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";

export default async function SpecialistAppointment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.specialistId, u.id))).limit(1);
  if (!a) notFound();
  const [client] = await db.select({ name: users.fullName, tz: users.timezone }).from(users).where(eq(users.id, a.userId)).limit(1);
  const [rel] = await db.select().from(careRelationships).where(and(eq(careRelationships.userId, a.userId), eq(careRelationships.specialistId, u.id))).limit(1);
  const [thread] = await db.select().from(threads).where(and(eq(threads.userId, a.userId), eq(threads.specialistId, u.id))).limit(1);
  const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.appointmentId, a.id)).limit(1);
  await audit(u, "view_appointment", "appointment", a.id);
  const [label, tone] = STATUS_LABEL[a.status];
  const now = Date.now();
  const canJoin = a.status === "booked" && now >= a.startsAt.getTime() - 15 * 60_000 && now <= a.endsAt.getTime() + 15 * 60_000;

  return (
    <>
      <PageHeader title={`${a.kind === "intro" ? "Colloquio gratuito" : "Seduta"} con ${client?.name ?? "utente"}`} subtitle={fmtDateTime(a.startsAt, u.timezone)} actions={<Badge tone={tone}>{label}</Badge>} />
      <Sp sp={sp} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2>Azioni</h2>
          <div className="flex flex-wrap gap-2">
            {canJoin && <LinkButton href={`/call/${a.id}`}>Avvia videochiamata</LinkButton>}
            {thread && <LinkButton href={`/specialist/chat/${thread.id}`} variant="secondary">Chat</LinkButton>}
            <LinkButton href={`/api/appointments/${a.id}/ics`} variant="secondary">.ics</LinkButton>
          </div>
          {rel && <p className="text-sm text-ink-600">Stato del percorso: <strong>{rel.status}</strong></p>}
          {a.status === "booked" && (
            <>
              <form action={outcomeAction} className="space-y-3 border-t border-ink-100 pt-3">
                <input type="hidden" name="id" value={a.id} />
                <h3>Esito</h3>
                <Field label="Esito"><select name="outcome"><option value="completed">Svolta</option><option value="no_show_user">Assenza dell&apos;utente</option><option value="cancelled_late">Annullata in ritardo dall&apos;utente</option></select></Field>
                <Field label="Nota sull'esito (facoltativa, non clinica)"><input name="note" /></Field>
                <Button>Registra esito</Button>
              </form>
              <form action={specialistCancelAction} className="border-t border-ink-100 pt-3">
                <input type="hidden" name="id" value={a.id} />
                <Button variant="danger">Annulla io (rimborso all&apos;utente)</Button>
              </form>
            </>
          )}
        </Card>
        <Card className="space-y-3">
          <h2>Note di seduta</h2>
          <p className="text-xs text-ink-500">Private e cifrate: le vedi solo tu. Non entrano nei report e il backoffice non le legge.</p>
          <form action={saveNoteAction} className="space-y-3">
            <input type="hidden" name="appointmentId" value={a.id} />
            <input type="hidden" name="userId" value={a.userId} />
            <textarea name="content" rows={10} defaultValue={note ? decryptText(note.contentEnc) : ""} />
            <Button variant="secondary">Salva nota</Button>
          </form>
          <Link href={`/specialist/reports?user=${a.userId}`} className="text-sm">Segnala un caso al responsabile clinico</Link>
        </Card>
      </div>
    </>
  );
}
