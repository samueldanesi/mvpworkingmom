import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createTicketAction, replyTicketAction } from "@/app/actions/user";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { db, ticketMessages, tickets } from "@/db";
import type { SessionUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";

export const TICKET_CATEGORIES: Record<string, string> = {
  general: "Informazioni generali",
  change_specialist: "Cambio specialista",
  missed_session: "Seduta saltata o problema tecnico",
  refund: "Rimborso",
  payment_dispute: "Contestazione di pagamento",
  privacy: "Privacy e dati personali",
};

export async function SupportIndex({ user, base, sp }: { user: SessionUser; base: string; sp: Record<string, string | string[] | undefined> }) {
  const rows = await db.select().from(tickets).where(eq(tickets.userId, user.id)).orderBy(desc(tickets.createdAt));
  return (
    <>
      <PageHeader title="Assistenza" subtitle="Rispondiamo entro un giorno lavorativo." />
      <Sp sp={sp} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <h2>Nuova richiesta</h2>
          <Notice tone="amber">Non è un canale di emergenza e non scrivere qui informazioni cliniche: per quelle usa la chat con il tuo specialista.</Notice>
          <form action={createTicketAction} className="space-y-3">
            <Field label="Argomento">
              <select name="category">{Object.entries(TICKET_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Oggetto"><input name="subject" required maxLength={120} /></Field>
            <Field label="Messaggio"><textarea name="body" rows={5} required /></Field>
            <Button>Invia</Button>
          </form>
          <p className="text-xs text-ink-500">Vedi anche le <Link href="/faq">domande frequenti</Link>.</p>
        </Card>
        <div className="space-y-2">
          <h2>Le tue richieste</h2>
          {rows.length === 0 ? <Empty>Nessuna richiesta.</Empty> : rows.map((t) => (
            <Card key={t.id} className="flex items-center justify-between text-sm">
              <div>
                <Link href={`${base}/${t.id}`} className="font-medium">{t.subject}</Link>
                <p className="text-ink-500">{fmtDateTime(t.createdAt, user.timezone)} · {TICKET_CATEGORIES[t.category] ?? t.category}</p>
              </div>
              <Badge tone={t.status === "closed" ? "gray" : t.status === "pending" ? "blue" : "amber"}>{t.status === "closed" ? "Chiusa" : t.status === "pending" ? "Risposta ricevuta" : "Aperta"}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

export async function TicketThreadView({ user, id, base, sp }: { user: SessionUser; id: string; base: string; sp: Record<string, string | string[] | undefined> }) {
  const [t] = await db.select().from(tickets).where(and(eq(tickets.id, id), eq(tickets.userId, user.id))).limit(1);
  if (!t) notFound();
  const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt));
  return (
    <>
      <PageHeader title={t.subject} subtitle={TICKET_CATEGORIES[t.category]} actions={<Link href={base}>← Tutte le richieste</Link>} />
      <Sp sp={sp} />
      <div className="space-y-3">
        {msgs.map((m) => (
          <Card key={m.id} className={m.fromStaff ? "border-teal-100 bg-teal-50" : ""}>
            <p className="text-xs text-ink-500">{m.fromStaff ? "Assistenza Working Mom" : "Tu"} · {fmtDateTime(m.createdAt, user.timezone)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
          </Card>
        ))}
      </div>
      {t.status !== "closed" && (
        <form action={replyTicketAction} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={id} />
          <textarea name="body" rows={3} required placeholder="Scrivi una risposta…" />
          <Button>Invia</Button>
        </form>
      )}
    </>
  );
}
