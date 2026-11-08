import { notFound } from "next/navigation";
import { Badge, Card, LinkButton, PageHeader, Sp } from "@/components/ui";
import { requireHr } from "@/lib/hr";
import type { Kpi } from "@/lib/kpi-core";
import { getReport } from "@/server/kpi";

export default async function ReportView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const r = await getReport((await params).id);
  if (!r || r.companyId !== co.id) notFound();
  const kpis = ((r.payload as { kpis: Kpi[] }).kpis) ?? [];
  return (
    <>
      <PageHeader title={`Report ${r.periodStart} → ${r.periodEnd}`} subtitle={`Versione ${r.version} · definizioni ${r.definitionsVersion} · soglia N=${r.kMin} · campione ${r.sampleSize}`} actions={<><LinkButton href={`/api/reports/${r.id}/pdf`} variant="secondary">PDF</LinkButton><LinkButton href={`/api/reports/${r.id}/csv`} variant="secondary">CSV</LinkButton></>} />
      <Sp sp={sp} />
      <div className="space-y-3">
        {kpis.map((k) => (
          <Card key={k.key} className="space-y-1 text-sm">
            <div className="flex items-center justify-between"><h3>{k.key} · {k.label}</h3>{k.suppressed && <Badge>Non mostrato</Badge>}</div>
            {!k.suppressed && k.value !== null && <p className="text-lg font-semibold">{k.value} {k.unit} <span className="text-sm font-normal text-ink-500">(n = {k.n})</span></p>}
            {k.breakdown?.map((c) => <p key={c.label}>{c.label}: {c.suppressed ? "—" : `${c.value} ${k.unit} (n=${c.n})`}</p>)}
            {k.note && <p className="text-ink-500">{k.note}</p>}
            <p className="text-xs text-ink-400">{k.definition}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
