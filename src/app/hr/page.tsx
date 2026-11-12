import Link from "next/link";
import { Badge, Button, Card, Field, LinkButton, Notice, PageHeader, Sp, str } from "@/components/ui";
import { requireHr } from "@/lib/hr";
import { NEED_AREAS } from "@/lib/constants";
import { kpisForCompany } from "@/server/kpi";

export const metadata = { title: "Dashboard HR" };

const fmt = (v: number | null, unit: string) => (v === null ? "—" : `${v}${unit === "%" ? "%" : ""}`);

/** B-08: indicatori aggregati con filtri per periodo, sede e area tematica. Mai nomi né dati individuali (B-04). */
export default async function HrDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const to = str(sp.to) ? new Date(str(sp.to)! + "T23:59:59") : new Date();
  const from = str(sp.from) ? new Date(str(sp.from)!) : new Date(to.getTime() - 90 * 86_400_000);
  const site = str(sp.site) || undefined;
  const area = str(sp.area) || undefined;
  const res = await kpisForCompany(co.id, { from, to, site, area });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const main = res.kpis.filter((k) => !k.key.startsWith("K-15"));
  const gender = res.kpis.filter((k) => k.key.startsWith("K-15"));

  return (
    <>
      <PageHeader title={`Programma ${co.name}`} subtitle="Dati aggregati e anonimi. L'azienda non vede mai chi usa il servizio né per cosa." actions={<LinkButton href="/hr/reports" variant="secondary">Report</LinkButton>} />
      <Sp sp={sp} />
      <Notice tone="blue">
        <strong>Perché conviene.</strong> Le imprese certificate UNI/PdR 102:2026 accedono a un esonero contributivo fino all&apos;1% (massimo 50.000 € l&apos;anno, D.L. 62/2026) e a un contributo fino a 12.000 € sui costi della prima certificazione (UNI/PdR 192:2026 in vigore dal 14 aprile 2026). Questi indicatori forniscono le evidenze misurabili: la certificazione la rilascia un ente accreditato.
      </Notice>
      <Card className="my-5">
        <form className="grid gap-3 sm:grid-cols-5" method="get">
          <Field label="Dal"><input type="date" name="from" defaultValue={iso(from)} /></Field>
          <Field label="Al"><input type="date" name="to" defaultValue={iso(to)} /></Field>
          <Field label="Sede"><select name="site" defaultValue={site ?? ""}><option value="">Tutte</option>{res.sites.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Area tematica"><select name="area" defaultValue={area ?? ""}><option value="">Tutte</option>{Object.entries(NEED_AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="flex items-end"><Button variant="secondary">Applica</Button></div>
        </form>
      </Card>
      {res.belowThreshold && (
        <Notice tone="amber">
          Con questi filtri il gruppo ha meno di <strong>{res.kMin}</strong> persone con consenso: per tutelare l&apos;anonimato nessun indicatore viene mostrato. Allarga il periodo o rimuovi un filtro.
        </Notice>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {main.map((k) => (
          <Card key={k.key} className="space-y-1">
            <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-ink-500">{k.key} · {k.label}</p>{k.suppressed && <Badge>Non mostrato</Badge>}</div>
            {k.breakdown ? (
              <ul className="text-sm">{k.breakdown.map((c) => <li key={c.label} className="flex justify-between"><span>{c.label}</span><span>{c.suppressed ? "—" : `${c.value}% (n=${c.n})`}</span></li>)}</ul>
            ) : (
              <p className="text-2xl font-semibold text-ink-900">{fmt(k.value, k.unit)} {k.value !== null && k.unit !== "%" && <span className="text-sm font-normal text-ink-500">{k.unit}</span>}</p>
            )}
            {k.note && <p className="text-xs text-ink-500">{k.note}</p>}
            <p className="text-xs text-ink-400">{k.definition}</p>
            {!k.suppressed && k.n > 0 && !k.breakdown && <p className="text-xs text-ink-500">Numerosità: {k.n}</p>}
          </Card>
        ))}
      </div>
      <h2 className="mb-2 mt-8">Ripartizione per genere</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {gender.map((k) => (
          <Card key={k.key}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{k.label}</p>
            {k.suppressed || !k.breakdown ? <p className="mt-1 text-sm text-ink-500">Non mostrato: celle sotto la soglia di anonimato.</p> : (
              <ul className="mt-1 text-sm">{k.breakdown.map((c) => <li key={c.label} className="flex justify-between"><span>{c.label}</span><span>{c.suppressed ? "—" : `${c.value} ${k.unit} (n=${c.n})`}</span></li>)}</ul>
            )}
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-ink-500">Gli esiti riguardano solo chi usa il servizio e si autoseleziona: non provano un effetto sull&apos;intera popolazione aziendale. Definizioni complete nei <Link href="/hr/reports">report</Link>. Sezione 7.3 dell&apos;Allegato A: il collegamento puntuale tra indicatori e prassi UNI va concordato con un lead auditor.</p>
    </>
  );
}
