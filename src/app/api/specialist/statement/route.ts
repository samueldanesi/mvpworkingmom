import { getUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { earnings } from "@/server/specialist";

export async function GET() {
  const u = await getUser();
  if (!u || u.role !== "specialist") return new Response("Non autorizzato", { status: 401 });
  const e = await earnings(u.id);
  const rows = [["data", "esito", "importo_cent", "commissione_cent", "netto_cent", "pagata"]];
  for (const { payment: p, appointment: a } of e.lines) rows.push([fmtDateTime(a.startsAt, u.timezone), a.status, String(p.amountCents - p.refundedCents), String(p.feeCents), String(p.specialistNetCents), p.payoutId ? "si" : "no"]);
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
  return new Response("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="estratto-conto.csv"', "Cache-Control": "private, no-store" } });
}
