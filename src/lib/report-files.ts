import type { Kpi } from "./kpi-core";
import { renderPdf } from "./pdf";

type ReportLike = { version: number; periodStart: string; periodEnd: string; definitionsVersion: string; kMin: number; sampleSize: number; createdAt: Date; payload: unknown };

function kpisOf(r: ReportLike): Kpi[] {
  return ((r.payload as { kpis?: Kpi[] }).kpis ?? []) as Kpi[];
}

const cell = (c: string | number | null) => `"${String(c ?? "").replace(/"/g, '""')}"`;

/** B-09 / T-09: CSV generato dal sistema, con definizioni, versione e numerosità. */
export function reportCsv(companyName: string, r: ReportLike): string {
  const rows: (string | number | null)[][] = [
    ["Azienda", companyName],
    ["Periodo", `${r.periodStart} / ${r.periodEnd}`],
    ["Versione report", r.version],
    ["Versione definizioni", r.definitionsVersion],
    ["Soglia minima di aggregazione (N)", r.kMin],
    ["Numerosità campione (consenso aggregato)", r.sampleSize],
    [],
    ["ID", "Indicatore", "Valore", "Unità", "Numerosità", "Stato", "Definizione", "Dettaglio"],
  ];
  for (const k of kpisOf(r)) {
    rows.push([k.key, k.label, k.value, k.unit, k.n, k.suppressed ? "non mostrato (sotto soglia o non disponibile)" : "ok", k.definition, k.note ?? ""]);
    for (const c of k.breakdown ?? []) rows.push([k.key, `  ${c.label}`, c.value, k.unit, c.n, c.suppressed ? "non mostrato (sotto soglia)" : "ok", "", ""]);
  }
  return "﻿" + rows.map((x) => x.map(cell).join(";")).join("\n");
}

export function reportPdf(companyName: string, r: ReportLike): Promise<Buffer> {
  return renderPdf((d) => {
    d.fontSize(18).text(`Report programma Working Mom`);
    d.moveDown(0.3).fontSize(11).fillColor("#555").text(`${companyName} · periodo ${r.periodStart} / ${r.periodEnd} · versione ${r.version}`);
    d.fontSize(9).text(`Definizioni ${r.definitionsVersion} · soglia di anonimato N=${r.kMin} · campione ${r.sampleSize} utenti con consenso aggregato · emesso il ${r.createdAt.toISOString().slice(0, 10)}`);
    d.moveDown().fillColor("#000");
    for (const k of kpisOf(r)) {
      if (d.y > 740) d.addPage();
      d.fontSize(11).font("Helvetica-Bold").text(`${k.key} · ${k.label}`, { continued: false });
      d.font("Helvetica").fontSize(10);
      if (k.suppressed) d.fillColor("#777").text("Dato non mostrato: numerosità sotto la soglia o indicatore non ancora disponibile.").fillColor("#000");
      else if (k.value !== null) d.text(`${k.value} ${k.unit} (n = ${k.n})${k.note ? " — " + k.note : ""}`);
      for (const c of k.breakdown ?? []) d.fontSize(9).text(`   • ${c.label}: ${c.suppressed ? "non mostrato" : `${c.value} ${k.unit} (n = ${c.n})`}`);
      d.fontSize(8).fillColor("#777").text(k.definition).fillColor("#000").moveDown(0.6);
    }
    d.moveDown().fontSize(8).fillColor("#777").text("Dati aggregati e anonimi. Il report non costituisce una certificazione: fornisce evidenze misurabili per gli enti accreditati (UNI/PdR 125:2022, UNI/PdR 192:2026). Un report emesso non si modifica: una correzione genera una nuova versione.", { width: 480 });
  });
}
