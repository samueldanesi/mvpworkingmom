import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { setUserStatusAction } from "@/app/actions/admin";
import { Badge, Button, Card, Field, Notice, PageHeader, Sp, str } from "@/components/ui";
import { appointments, companies, db, payments, users } from "@/db";
import { audit } from "@/lib/audit";
import { eur, fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

const REASONS = ["Assistenza a una richiesta dell'utente", "Verifica pagamento o rimborso", "Richiesta GDPR", "Segnalazione di sicurezza", "Altro (specificare nel ticket)"];

/** C-08: "ogni accesso a un dato personale è registrato (chi, quando, perché)". Nessun dato clinico qui. */
export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const staff = await requireStaff("users.view");
  const reason = str(sp.reason);
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) notFound();
  if (!reason) {
    return (
      <>
        <PageHeader title="Apri scheda utente" />
        <Card className="max-w-lg space-y-3">
          <Notice>Per aprire dati personali devi indicare il motivo. L&apos;accesso viene registrato.</Notice>
          <form className="space-y-3"><Field label="Motivo"><select name="reason">{REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field><Button>Apri</Button></form>
        </Card>
      </>
    );
  }
  await audit(staff, "view_user", "user", id, reason);
  const [co] = u.companyId ? await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
  const appts = await db.select().from(appointments).where(eq(appointments.userId, id)).orderBy(desc(appointments.startsAt)).limit(15);
  const pays = await db.select().from(payments).where(eq(payments.userId, id)).orderBy(desc(payments.createdAt)).limit(15);
  return (
    <>
      <PageHeader title={u.fullName ?? u.email} subtitle={`${u.email} · ruolo ${u.role}`} actions={<Badge tone={u.status === "active" ? "green" : "red"}>{u.status}</Badge>} />
      <Sp sp={sp} />
      <Notice tone="blue">Motivo registrato: {reason}. Chat, note e questionario non sono consultabili dal backoffice.</Notice>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <Card className="space-y-1 text-sm"><h2>Anagrafica</h2><p>Fuso orario: {u.timezone}</p><p>Telefono: {u.phone ?? "—"}</p><p>Azienda: {co?.name ?? "— (privato)"} {u.coverageKind && `(${u.coverageKind})`}</p><p>Email confermata: {u.emailVerifiedAt ? "sì" : "no"} · 2FA: {u.totpEnabled ? "attivo" : "no"}</p>
          <form action={setUserStatusAction} className="pt-2"><input type="hidden" name="id" value={u.id} /><input type="hidden" name="reason" value={reason} /><input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} /><Button variant={u.status === "active" ? "danger" : "secondary"}>{u.status === "active" ? "Sospendi account" : "Riattiva account"}</Button></form>
        </Card>
        <Card className="space-y-2 text-sm"><h2>Appuntamenti recenti</h2><ul>{appts.map((a) => <li key={a.id}>{fmtDateTime(a.startsAt)} · {a.kind} · {a.status}</li>)}</ul></Card>
        <Card className="space-y-2 text-sm md:col-span-2"><h2>Pagamenti</h2><table><thead><tr><th>Data</th><th>Importo</th><th>Origine</th><th>Stato</th></tr></thead><tbody>{pays.map((p) => <tr key={p.id}><td>{fmtDateTime(p.createdAt)}</td><td>{eur(p.amountCents)}</td><td>{p.source}</td><td>{p.status}{p.refundedCents ? ` (rimborsati ${eur(p.refundedCents)})` : ""}</td></tr>)}</tbody></table></Card>
      </div>
    </>
  );
}
