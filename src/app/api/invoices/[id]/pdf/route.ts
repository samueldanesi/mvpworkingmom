import { eq } from "drizzle-orm";
import { db, invoices } from "@/db";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { eur, fmtDate } from "@/lib/format";
import { ISSUER, renderPdf } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Non autorizzato", { status: 401 });
  const { id } = await params;
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  const allowed = inv && (inv.userId === u.id || can(u.role, "finance.view"));
  if (!inv || !allowed) return new Response("Non trovato", { status: 404 });
  if (inv.userId !== u.id) await audit(u, "invoice_view", "invoice", inv.id, "finanza");

  const pdf = await renderPdf((d) => {
    d.fontSize(18).text(inv.kind === "credit_note" ? "Nota di credito" : "Fattura / ricevuta", { align: "left" });
    d.moveDown(0.5).fontSize(10).fillColor("#555").text(`Numero ${inv.number} · ${fmtDate(inv.issuedAt)}`);
    d.moveDown().fillColor("#000").fontSize(11).text(ISSUER.name).fontSize(10).text(ISSUER.address).text(ISSUER.vat);
    d.moveDown().fontSize(10).fillColor("#555").text("Intestata a").fillColor("#000").fontSize(11).text(inv.billToName ?? "").text(inv.billToEmail ?? "");
    d.moveDown(1.5).fontSize(11).text(inv.description);
    d.moveDown().fontSize(14).text(`Totale: ${eur(inv.totalCents)}`);
    d.moveDown(2).fontSize(8).fillColor("#777").text(
      "Documento utilizzabile per la richiesta di rimborso tramite welfare aziendale dove previsto. Non costituisce fattura elettronica ai fini fiscali fino all'attivazione dell'invio al Sistema di Interscambio.",
      { width: 480 },
    );
  });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${inv.number}.pdf"`, "Cache-Control": "private, no-store" } });
}
