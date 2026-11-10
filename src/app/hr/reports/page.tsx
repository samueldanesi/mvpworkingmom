import Link from "next/link";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { issueReportAction } from "@/app/actions/hr";
import { fmtDate } from "@/lib/format";
import { requireHr } from "@/lib/hr";
import { listReports } from "@/server/kpi";

export const metadata = { title: "Report" };

/** B-09 / D-07: report periodici in PDF e CSV; un report emesso non si modifica. */
export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const rows = await listReports(co.id);
  const today = new Date();
  const from = new Date(today.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Report" subtitle="Ogni indicatore ha definizione, formula, versione, periodo e numerosità. Un report emesso non cambia: una correzione genera una nuova versione." />
      <Sp sp={sp} />
      <Card className="mb-6 space-y-3">
        <h2>Emetti un nuovo report</h2>
        <form action={issueReportAction} className="grid gap-3 sm:grid-cols-4"><Field label="Dal"><input type="date" name="from" defaultValue={from} required /></Field><Field label="Al"><input type="date" name="to" defaultValue={today.toISOString().slice(0, 10)} required /></Field><div className="flex items-end"><Button>Emetti</Button></div></form>
      </Card>
      {rows.length === 0 ? <Empty>Nessun report emesso.</Empty> : (
        <Card className="p-0"><table><thead><tr><th>Periodo</th><th>Versione</th><th>Campione</th><th>Emesso</th><th></th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{r.periodStart} → {r.periodEnd}</td><td>v{r.version} {r.supersedesId && <Badge tone="blue">corregge la precedente</Badge>}</td><td>{r.sampleSize}</td><td>{fmtDate(r.createdAt)}</td><td className="space-x-3"><Link href={`/hr/reports/${r.id}`}>Apri</Link><a href={`/api/reports/${r.id}/pdf`}>PDF</a><a href={`/api/reports/${r.id}/csv`}>CSV</a><a href={`/api/reports/${r.id}/csv?cert=1`}>Export certificazioni</a></td></tr>)}
        </tbody></table></Card>
      )}
    </>
  );
}
