import { Badge, Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { eur, fmtDate, fmtDateTime } from "@/lib/format";
import { earnings } from "@/server/specialist";
import { getRules } from "@/server/settings";

export const metadata = { title: "Compensi" };

/** S-09: importi netti della commissione di piattaforma, pagamento periodico (Stripe Connect o equivalente). */
export default async function Earnings() {
  const u = await requireUser({ roles: ["specialist"] });
  const e = await earnings(u.id);
  const rules = await getRules();
  return (
    <>
      <PageHeader title="Compensi" subtitle={`Importi al netto della commissione di piattaforma (${rules.platformFeePct}%).`} actions={<a href="/api/specialist/statement" className="text-sm">Scarica estratto conto (CSV)</a>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Maturati, da pagare" value={eur(e.accrued.net)} hint={`${e.accrued.n} sedute · lordo ${eur(e.accrued.gross)} · commissione ${eur(e.accrued.fee)}`} />
        <Stat label="Sedute confermate" value={eur(e.upcoming.net)} hint={`${e.upcoming.n} in programma`} />
        <Stat label="Già pagati" value={eur(e.payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.netCents, 0))} />
      </div>
      <Notice tone="blue">Il modello di fatturazione tra specialista e piattaforma (S-10) è ancora da definire con il commercialista della Committente.</Notice>
      <h2 className="mb-2 mt-6">Pagamenti</h2>
      {e.payouts.length === 0 ? <Empty>Nessun pagamento ancora emesso.</Empty> : (
        <Card className="p-0"><table><thead><tr><th>Periodo</th><th>Sedute</th><th>Netto</th><th>Stato</th></tr></thead><tbody>{e.payouts.map((p) => <tr key={p.id}><td>{p.periodStart} → {p.periodEnd}</td><td>{p.sessionsCount}</td><td>{eur(p.netCents)}</td><td><Badge tone={p.status === "paid" ? "green" : "amber"}>{p.status === "paid" ? "Pagato" : "In emissione"}</Badge></td></tr>)}</tbody></table></Card>
      )}
      <h2 className="mb-2 mt-6">Dettaglio sedute</h2>
      {e.lines.length === 0 ? <Empty>Nessuna seduta.</Empty> : (
        <Card className="p-0"><table><thead><tr><th>Data</th><th>Esito</th><th>Importo</th><th>Commissione</th><th>Netto</th></tr></thead><tbody>
          {e.lines.slice(0, 60).map(({ payment: p, appointment: a }) => <tr key={p.id}><td>{fmtDateTime(a.startsAt, u.timezone)}</td><td>{a.status}{p.payoutId ? " · pagata" : ""}</td><td>{eur(p.amountCents - p.refundedCents)}</td><td>{eur(p.feeCents)}</td><td>{eur(p.specialistNetCents)}</td></tr>)}
        </tbody></table></Card>
      )}
      <span className="hidden">{fmtDate(new Date())}</span>
    </>
  );
}
