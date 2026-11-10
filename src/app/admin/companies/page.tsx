import Link from "next/link";
import { desc } from "drizzle-orm";
import { saveCompanyAction } from "@/app/actions/admin";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { companies, db } from "@/db";
import { PIPELINE_STAGES } from "@/lib/constants";
import { eur } from "@/lib/format";
import { requireStaff } from "@/lib/guard";

export const metadata = { title: "Aziende" };

export default async function Companies({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("companies.manage");
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt));
  return (
    <>
      <PageHeader title="Aziende" />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          {rows.length === 0 ? <div className="p-5"><Empty>Nessuna azienda.</Empty></div> : (
            <table><thead><tr><th>Azienda</th><th>Fase</th><th>Dipendenti</th><th>Valore</th><th>Stato</th></tr></thead><tbody>
              {rows.map((c) => <tr key={c.id}><td><Link href={`/admin/companies/${c.id}`}>{c.name}</Link></td><td>{c.pipelineStage}</td><td>{c.coveredEmployees}</td><td>{eur(c.contractValueCents)}</td><td><Badge tone={c.status === "active" ? "green" : "amber"}>{({ active: "Attivo", suspended: "Sospeso", ended: "Concluso" } as Record<string, string>)[c.status] ?? c.status}</Badge></td></tr>)}
            </tbody></table>
          )}
        </Card>
        <Card className="space-y-3">
          <h2>Nuova azienda</h2>
          <form action={saveCompanyAction} className="space-y-3">
            <Field label="Ragione sociale"><input name="name" required /></Field>
            <Field label="P.IVA"><input name="vatNumber" /></Field>
            <Field label="Dipendenti coperti"><input name="coveredEmployees" type="number" min={0} defaultValue={0} /></Field>
            <Field label="Sedute incluse per dipendente"><input name="includedSessions" type="number" min={0} defaultValue={3} /></Field>
            <Field label="Fase commerciale"><select name="pipelineStage" defaultValue="contatto">{PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Button>Crea</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
