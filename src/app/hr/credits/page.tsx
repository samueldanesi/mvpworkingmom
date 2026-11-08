import { Notice, PageHeader, Stat } from "@/components/ui";
import { requireHr } from "@/lib/hr";
import { creditRegistry } from "@/server/kpi";

export const metadata = { title: "Crediti" };

/** B-05: sedute incluse assegnate, consumate, residue, scadute. In aggregato e sopra soglia (B-04). */
export default async function Credits() {
  const { co } = await requireHr();
  const r = await creditRegistry(co.id);
  return (
    <>
      <PageHeader title="Registro crediti" subtitle="Sedute incluse del programma, in forma aggregata." />
      {r.suppressed ? (
        <Notice tone="amber">Finché meno di {r.kMin} persone hanno attivato il benefit non mostriamo i dettagli sui crediti: con numeri così piccoli si potrebbe risalire a una persona.</Notice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Assegnate" value={r.granted} hint={`su ${r.seats} dipendenti coperti`} />
          <Stat label="Consumate" value={r.consumed} />
          <Stat label="Residue" value={r.residual} />
          <Stat label="Scadute" value={r.expired} />
        </div>
      )}
    </>
  );
}
