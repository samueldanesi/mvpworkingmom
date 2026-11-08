import { desc, eq, sql } from "drizzle-orm";
import { createCompanyInvoiceAction, generatePayoutsAction, markPayoutPaidAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp, Stat } from "@/components/ui";
import { companies, companyInvoices, db, payments, payouts, users } from "@/db";
import { eur, fmtDate, fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { can } from "@/lib/permissions";

export const metadata = { title: "Finanza" };

/** C-07: incassi, commissioni, pagamenti agli specialisti, fatture alle aziende, note di credito, riconciliazione. */
export default async function Finance({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireStaff("finance.view");
  const [t] = await db.select({
    collected: sql<number>`coalesce(sum(amount_cents - refunded_cents) filter (where source='personal' and status in ('paid','partially_refunded')),0)`,
    credits: sql<number>`coalesce(sum(amount_cents) filter (where source='company_credit' and status='paid'),0)`,
    fees: sql<number>`coalesce(sum(fee_cents) filter (where status in ('paid','partially_refunded')),0)`,
    net: sql<number>`coalesce(sum(specialist_net_cents) filter (where status in ('paid','partially_refunded')),0)`,
    refunded: sql<number>`coalesce(sum(refunded_cents),0)`,
    failed: sql<number>`count(*) filter (where status='failed')`,
  }).from(payments);
  const pays = await db.select({ p: payments, name: users.fullName }).from(payments).leftJoin(users, eq(users.id, payments.userId)).orderBy(desc(payments.createdAt)).limit(40);
  const pos = await db.select({ po: payouts, name: users.fullName }).from(payouts).innerJoin(users, eq(users.id, payouts.specialistId)).orderBy(desc(payouts.createdAt)).limit(30);
  const cos = await db.select().from(companies);
  const inv = await db.select({ i: companyInvoices, name: companies.name }).from(companyInvoices).innerJoin(companies, eq(companies.id, companyInvoices.companyId)).orderBy(desc(companyInvoices.issuedAt)).limit(30);
  const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Finanza" subtitle="Il modello fiscale (chi fattura a chi) è una decisione aperta della Committente: qui si tracciano i flussi, non si emettono documenti SDI." />
      <Sp sp={sp} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Incassato (privati)" value={eur(t.collected)} /><Stat label="Sedute su crediti" value={eur(t.credits)} hint="valore, pagate dall'azienda" /><Stat label="Commissioni" value={eur(t.fees)} />
        <Stat label="Netto specialisti" value={eur(t.net)} /><Stat label="Rimborsati" value={eur(t.refunded)} /><Stat label="Pagamenti falliti" value={t.failed} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2>Pagamenti agli specialisti</h2>
          {can(u.role, "payouts.run") && <form action={generatePayoutsAction} className="flex flex-wrap items-end gap-2"><Field label="Dal"><input type="date" name="from" defaultValue={day(-30)} /></Field><Field label="Al"><input type="date" name="to" defaultValue={day(0)} /></Field><Button variant="secondary">Genera</Button></form>}
          {pos.length === 0 ? <Empty>Nessun pagamento emesso.</Empty> : <table><thead><tr><th>Specialista</th><th>Periodo</th><th>Netto</th><th></th></tr></thead><tbody>{pos.map(({ po, name }) => <tr key={po.id}><td>{name}</td><td>{po.periodStart} → {po.periodEnd}</td><td>{eur(po.netCents)}</td><td>{po.status === "paid" ? <Badge tone="green">Pagato</Badge> : can(u.role, "payouts.run") ? <form action={markPayoutPaidAction}><input type="hidden" name="id" value={po.id} /><button className="text-xs underline">Segna pagato</button></form> : <Badge tone="amber">In emissione</Badge>}</td></tr>)}</tbody></table>}
        </Card>
        <Card className="space-y-3">
          <h2>Fatture alle aziende</h2>
          <form action={createCompanyInvoiceAction} className="grid gap-2 sm:grid-cols-2"><Field label="Azienda"><select name="companyId">{cos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Tipo"><select name="kind"><option value="invoice">Fattura</option><option value="credit_note">Nota di credito</option></select></Field><Field label="Importo €"><input name="amount" type="number" step="0.01" min="0.01" required /></Field><Field label="Descrizione"><input name="description" /></Field><div className="sm:col-span-2"><Button variant="secondary">Registra</Button></div></form>
          {inv.length > 0 && <table><thead><tr><th>N.</th><th>Azienda</th><th>Importo</th><th>Data</th></tr></thead><tbody>{inv.map(({ i, name }) => <tr key={i.id}><td>{i.number}</td><td>{name}</td><td>{eur(i.amountCents)}</td><td>{fmtDate(i.issuedAt)}</td></tr>)}</tbody></table>}
        </Card>
      </div>
      <Card className="mt-6 space-y-3 p-0">
        <h2 className="p-5 pb-0">Riconciliazione pagamenti</h2>
        <Notice tone="blue">Con Stripe collegato, il riferimento del fornitore (colonna Rif.) si confronta con l&apos;estratto Stripe. In modalità di prova i riferimenti sono simulati.</Notice>
        <table><thead><tr><th>Data</th><th>Utente</th><th>Importo</th><th>Commissione</th><th>Netto spec.</th><th>Origine</th><th>Stato</th><th>Rif.</th></tr></thead><tbody>
          {pays.map(({ p, name }) => <tr key={p.id}><td>{fmtDateTime(p.createdAt)}</td><td>{name ?? "—"}</td><td>{eur(p.amountCents)}</td><td>{eur(p.feeCents)}</td><td>{eur(p.specialistNetCents)}</td><td>{p.source}</td><td>{p.status}</td><td className="font-mono text-xs">{p.providerRef ?? "—"}</td></tr>)}
        </tbody></table>
      </Card>
    </>
  );
}
