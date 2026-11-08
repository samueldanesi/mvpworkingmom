import { Badge, Card, PageHeader } from "@/components/ui";
import { SPECIALTIES } from "@/lib/constants";
import { eur, fmtDate } from "@/lib/format";
import { requireHr } from "@/lib/hr";

export const metadata = { title: "Programma" };

/** B-01 / B-02: anagrafica, contratto e regole di copertura (modificabili dal backoffice). */
export default async function Program() {
  const { co } = await requireHr();
  const row = (l: string, v: React.ReactNode) => <div className="flex justify-between gap-4 border-b border-ink-50 py-2 text-sm"><dt className="text-ink-500">{l}</dt><dd className="text-right">{v}</dd></div>;
  return (
    <>
      <PageHeader title="Il programma" subtitle="Per modificare contratto o regole scrivi al tuo referente Working Mom." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card><h2 className="mb-2">Anagrafica e contratto</h2><dl>
          {row("Ragione sociale", co.name)}{row("P.IVA", co.vatNumber ?? "—")}{row("Codice SDI / PEC", `${co.sdiCode ?? "—"} / ${co.pec ?? "—"}`)}
          {row("Dipendenti coperti", co.coveredEmployees)}{row("Durata", `${co.startsAt ? fmtDate(co.startsAt) : "—"} → ${co.endsAt ? fmtDate(co.endsAt) : "—"}`)}
          {row("Canone annuo", eur(co.annualFeeCents))}{row("Stato", <Badge tone={co.status === "active" ? "green" : "amber"}>{co.status}</Badge>)}{row("Referente Working Mom", co.accountOwner ?? "—")}
        </dl></Card>
        <Card><h2 className="mb-2">Regole di copertura</h2><dl>
          {row("Sedute incluse per dipendente", co.includedSessions)}{row("Sconto sulle successive", `${co.discountPct}%`)}
          {row("Specialità coperte", co.coveredSpecialties.length ? co.coveredSpecialties.map((s) => SPECIALTIES[s] ?? s).join(", ") : "Tutte")}
          {row("Familiari per dipendente", co.familyMax)}{row("Sconto per i familiari", `${co.familyDiscountPct}%`)}
        </dl></Card>
      </div>
    </>
  );
}
