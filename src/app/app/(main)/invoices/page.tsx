import { desc, eq } from "drizzle-orm";
import { Card, Empty, Notice, PageHeader } from "@/components/ui";
import { db, invoices } from "@/db";
import { requireUser } from "@/lib/auth";
import { eur, fmtDate } from "@/lib/format";

export const metadata = { title: "Fatture" };

/** U-14: "Scarica fattura" per ogni seduta pagata. */
export default async function Invoices() {
  const u = await requireUser({ roles: ["user"] });
  const rows = await db.select().from(invoices).where(eq(invoices.userId, u.id)).orderBy(desc(invoices.issuedAt));
  return (
    <>
      <PageHeader title="Fatture" subtitle="Una per ogni seduta a pagamento. Utilizzabile per il rimborso dal welfare aziendale dove previsto." />
      {rows.length === 0 ? (
        <Empty>Nessuna fattura. Le sedute coperte dal tuo programma non generano fatture a tuo carico.</Empty>
      ) : (
        <Card className="p-0">
          <table>
            <thead><tr><th>Numero</th><th>Data</th><th>Descrizione</th><th className="text-right">Importo</th><th></th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>{i.number}{i.kind === "credit_note" && " (nota di credito)"}</td>
                  <td>{fmtDate(i.issuedAt, u.timezone)}</td>
                  <td>{i.description}</td>
                  <td className="text-right">{eur(i.totalCents)}</td>
                  <td><a href={`/api/invoices/${i.id}/pdf`}>Scarica</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-4"><Notice>I documenti qui sopra non sono ancora fatture elettroniche inviate allo SDI: il collegamento al fornitore e al Sistema Tessera Sanitaria è da definire con il commercialista (T-07).</Notice></div>
    </>
  );
}
