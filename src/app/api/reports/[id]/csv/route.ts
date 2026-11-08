import { eq } from "drizzle-orm";
import { companies, db } from "@/db";
import { getUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { reportCsv } from "@/lib/report-files";
import { getReport } from "@/server/kpi";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Non autorizzato", { status: 401 });
  const r = await getReport((await params).id);
  const ok = r && ((u.role === "hr" && u.companyId === r.companyId) || (u.role === "admin" && can(u.role, "companies.manage")));
  if (!r || !ok) return new Response("Non trovato", { status: 404 });
  const [co] = await db.select().from(companies).where(eq(companies.id, r.companyId)).limit(1);
  await audit(u, "report_export", "report", r.id);
  return new Response(reportCsv(co.name, r), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="report-${r.periodStart}-v${r.version}.csv"`, "Cache-Control": "private, no-store" } });
}
