import { eq } from "drizzle-orm";
import { Card, PageHeader } from "@/components/ui";
import { accessCodes, db } from "@/db";
import { env } from "@/lib/env";
import { requireHr } from "@/lib/hr";

export const metadata = { title: "Lancio" };

/** B-07: kit di comunicazione per l'HR (nell'MVP, pagina di lancio solo con il brand Working Mom). */
export default async function Launch() {
  const { co } = await requireHr();
  const codes = await db.select().from(accessCodes).where(eq(accessCodes.companyId, co.id));
  const code = codes.find((c) => c.kind === "shared" && !c.revokedAt)?.code ?? "IL-TUO-CODICE";
  const link = `${env.appUrl}/join/${code}`;
  const mail = `Oggetto: Un nuovo benefit per te e per la tua famiglia\n\nCiao,\n\n${co.name} ha attivato Working Mom: consulenze con psicologi, logopedisti, consulenti del sonno e altri specialisti, in videochiamata.\n\n• ${co.includedSessions} sedute incluse, ${co.discountPct}% di sconto sulle successive\n• Primo colloquio gratuito di 20 minuti\n• Totale riservatezza: l'azienda non vede mai chi usa il servizio né per cosa\n\nPer iniziare registrati qui: ${link}\nCodice aziendale: ${code}\n\nA presto.`;
  return (
    <>
      <PageHeader title="Kit di lancio" subtitle="Testi pronti da inviare ai dipendenti." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-2"><h2>Email di lancio</h2><pre className="whitespace-pre-wrap font-sans text-sm text-ink-700">{mail}</pre></Card>
        <Card className="space-y-2"><h2>Testo per la intranet</h2><p className="text-sm text-ink-700">Working Mom: specialisti per la genitorialità, sempre a disposizione. Attiva il tuo benefit con il codice <strong>{code}</strong> su {link}.</p><h3 className="pt-2">Pagina di lancio</h3><p className="text-sm text-ink-600">Nell&apos;MVP la pagina di lancio è unica, con il brand Working Mom. Le pagine personalizzate per azienda sono previste dopo l&apos;MVP.</p></Card>
      </div>
    </>
  );
}
