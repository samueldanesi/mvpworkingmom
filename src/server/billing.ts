import { eq } from "drizzle-orm";
import { appointments, creditLedger, db, invoices, payments, users } from "@/db";
import { refundExternal, splitAmount } from "@/lib/payments";
import { fmtDateTime } from "@/lib/format";
import { sqlClient } from "@/db";
import { getRules } from "./settings";

export async function nextNumber(prefix: "WM" | "CE"): Promise<string> {
  const rows = await sqlClient`select nextval('identity.invoice_seq') as n`;
  return `${prefix}-${new Date().getFullYear()}-${String(rows[0].n).padStart(6, "0")}`;
}

/**
 * U-14 / B-06: documento per seduta intestato all'utente, utilizzabile per il rimborso welfare.
 * ATTENZIONE: non è ancora una fattura elettronica SDI (T-07): richiede il fornitore scelto e il
 * parere del commercialista. Finché non è collegato, il documento riporta la dicitura relativa.
 */
export async function issueInvoice(paymentId: string, kind: "invoice" | "credit_note" = "invoice", amountOverride?: number) {
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p || p.source !== "personal") return null;
  const [u] = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
  const [a] = p.appointmentId ? await db.select().from(appointments).where(eq(appointments.id, p.appointmentId)).limit(1) : [];
  const [spec] = a ? await db.select({ name: users.fullName }).from(users).where(eq(users.id, a.specialistId)).limit(1) : [];
  const total = amountOverride ?? p.amountCents;
  const number = await nextNumber("WM");
  const [inv] = await db
    .insert(invoices)
    .values({
      number,
      kind,
      paymentId,
      userId: p.userId,
      billToName: u?.fullName ?? u?.email ?? "Utente",
      billToEmail: u?.email,
      description: a ? `Consulenza con ${spec?.name ?? "specialista"} del ${fmtDateTime(a.startsAt)}` : "Consulenza",
      totalCents: kind === "credit_note" ? -Math.abs(total) : total,
    })
    .returning();
  return inv;
}

export async function recomputeSplit(paymentId: string) {
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const { platformFeePct } = await getRules();
  const base = Math.max(0, p.amountCents - p.refundedCents);
  const s = splitAmount(base, platformFeePct);
  await db.update(payments).set({ feeCents: s.feeCents, specialistNetCents: s.specialistNetCents }).where(eq(payments.id, paymentId));
}

/** Rimborso totale o parziale. I crediti aziendali tornano nel registro, i pagamenti personali al fornitore. */
export async function refundPayment(paymentId: string, amountCents?: number): Promise<{ ok: boolean; message?: string }> {
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) return { ok: false, message: "Pagamento non trovato." };
  if (p.status !== "paid" && p.status !== "partially_refunded") return { ok: false, message: "Il pagamento non è rimborsabile." };
  const refundable = p.amountCents - p.refundedCents;
  const amount = Math.min(amountCents ?? refundable, refundable);
  if (amount <= 0) return { ok: false, message: "Importo non valido." };

  if (p.source === "company_credit") {
    const [a] = p.appointmentId ? await db.select().from(appointments).where(eq(appointments.id, p.appointmentId)).limit(1) : [];
    const [u] = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
    if (u?.companyId) {
      await db.insert(creditLedger).values({
        companyId: u.companyId,
        userId: p.userId,
        delta: 1,
        reason: "refund",
        appointmentId: a?.id,
        note: "Seduta annullata nei termini: credito ripristinato",
      });
    }
    await db.update(payments).set({ status: "refunded", refundedCents: p.amountCents, specialistNetCents: 0, feeCents: 0 }).where(eq(payments.id, p.id));
    return { ok: true };
  }

  const r = await refundExternal(p.providerRef, amount);
  if (!r.ok) return { ok: false, message: "Il fornitore di pagamento ha rifiutato il rimborso." };
  const refunded = p.refundedCents + amount;
  await db
    .update(payments)
    .set({ refundedCents: refunded, status: refunded >= p.amountCents ? "refunded" : "partially_refunded" })
    .where(eq(payments.id, p.id));
  await recomputeSplit(p.id);
  await issueInvoice(p.id, "credit_note", amount);
  return { ok: true };
}
