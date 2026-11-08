import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { adminRefundAction, closeTicketAction, staffReplyTicketAction } from "@/app/actions/admin";
import { Badge, Button, Card, Field, PageHeader, Sp } from "@/components/ui";
import { appointments, db, payments, ticketMessages, tickets, users } from "@/db";
import { audit } from "@/lib/audit";
import { eur, fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export default async function TicketAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const staff = await requireStaff("tickets.handle");
  const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!t) notFound();
  const [author] = t.userId ? await db.select().from(users).where(eq(users.id, t.userId)).limit(1) : [];
  const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt));
  const pays = t.userId ? await db.select({ p: payments, a: appointments }).from(payments).innerJoin(appointments, eq(appointments.id, payments.appointmentId)).where(eq(payments.userId, t.userId)).orderBy(desc(payments.createdAt)).limit(10) : [];
  await audit(staff, "view_ticket", "ticket", id, "assistenza");
  return (
    <>
      <PageHeader title={t.subject} subtitle={`${author?.fullName ?? "—"} · ${author?.email ?? ""} · ${t.category}`} actions={<Badge>{t.status}</Badge>} />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {msgs.map((m) => <Card key={m.id} className={m.fromStaff ? "border-teal-100 bg-teal-50" : ""}><p className="text-xs text-ink-500">{m.fromStaff ? "Staff" : "Utente"} · {fmtDateTime(m.createdAt)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p></Card>)}
          <form action={staffReplyTicketAction} className="space-y-2"><input type="hidden" name="id" value={id} /><textarea name="body" rows={3} required placeholder="Risposta all'utente…" /><div className="flex gap-2"><Button>Rispondi</Button></div></form>
          {t.status !== "closed" && <form action={closeTicketAction}><input type="hidden" name="id" value={id} /><Button variant="secondary">Chiudi richiesta</Button></form>}
        </div>
        <Card className="space-y-3">
          <h2>Pagamenti dell&apos;utente</h2>
          {pays.length === 0 ? <p className="text-sm text-ink-500">Nessun pagamento.</p> : (
            <ul className="divide-y divide-ink-100 text-sm">{pays.map(({ p, a }) => (
              <li key={p.id} className="space-y-1 py-2">
                <p>{fmtDateTime(a.startsAt)} · {eur(p.amountCents)} · {p.source} · <strong>{p.status}</strong>{p.refundedCents ? ` (rimb. ${eur(p.refundedCents)})` : ""}</p>
                {(p.status === "paid" || p.status === "partially_refunded") && p.source === "personal" && (
                  <form action={adminRefundAction} className="flex items-end gap-2"><input type="hidden" name="paymentId" value={p.id} /><input type="hidden" name="back" value={`/admin/support/${id}`} /><Field label="Importo (vuoto = totale) €"><input name="amount" type="number" step="0.01" min="0.01" /></Field><Field label="Motivo"><input name="reason" /></Field><Button variant="secondary">Rimborsa</Button></form>
                )}
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
