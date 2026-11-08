import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { payAction, payFailAction } from "@/app/actions/booking";
import { Button, Card, Notice } from "@/components/ui";
import { appointments, db, payments } from "@/db";
import { requireUser } from "@/lib/auth";
import { eur, fmtDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import { expireHolds } from "@/server/slotsDb";
import { str } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Checkout SIMULATO (PAYMENT_PROVIDER=mock): sostituisce la pagina Stripe Checkout in sviluppo e collaudo.
 * Nessun dato carta viene richiesto né memorizzato (P-08).
 */
export default async function MockPay({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const ids = (str(sp.ids) ?? "").split(",").filter(Boolean);
  await expireHolds();
  const rows = ids.length
    ? await db
        .select({ p: payments, a: appointments })
        .from(payments)
        .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
        .where(and(inArray(payments.id, ids), eq(payments.userId, u.id)))
    : [];
  const pending = rows.filter((r) => r.p.status === "pending" || (r.p.status === "failed" && r.p.failureReason === "Tempo scaduto"));
  if (rows.length === 0) redirect("/app/appointments");
  const total = pending.reduce((s, r) => s + r.p.amountCents, 0);
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1>Pagamento</h1>
      {env.paymentProvider !== "mock" && <Notice tone="red">Questa pagina serve solo in modalità di prova.</Notice>}
      <Notice tone="blue">Ambiente di prova: nessun addebito reale. In produzione qui c&apos;è il checkout sicuro del fornitore (carta, Apple Pay, Google Pay).</Notice>
      <Card className="space-y-3">
        <ul className="divide-y divide-ink-100 text-sm">
          {rows.map(({ p, a }) => (
            <li key={p.id} className="flex justify-between py-2">
              <span>Seduta del {fmtDateTime(a.startsAt, u.timezone)}</span>
              <span>{eur(p.amountCents)}</span>
            </li>
          ))}
        </ul>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-600">Niente da pagare per questi appuntamenti.</p>
        ) : (
          <>
            <p className="flex justify-between border-t border-ink-100 pt-3 font-semibold"><span>Totale</span><span>{eur(total)}</span></p>
            <p className="text-xs text-ink-500">Lo slot resta riservato per {env.holdMinutes} minuti.</p>
            <form action={payAction}>
              <input type="hidden" name="ids" value={pending.map((r) => r.p.id).join(",")} />
              <Button className="w-full">Paga {eur(total)} (carta di prova)</Button>
            </form>
            <form action={payFailAction}>
              <input type="hidden" name="ids" value={pending.map((r) => r.p.id).join(",")} />
              <Button variant="secondary" className="w-full">Simula pagamento rifiutato</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
