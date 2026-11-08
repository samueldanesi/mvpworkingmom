import { env } from "@/lib/env";

/**
 * U-13 / T-03: pagamenti. P-08: nessun dato carta sui nostri server (lo gestisce il fornitore).
 * - mock  : pagina /app/pay che simula esito positivo o fallito (sviluppo e collaudo)
 * - stripe: Stripe Checkout (carte, Apple Pay, Google Pay) + Connect. NON testato con chiavi reali.
 */
export type CheckoutItem = { paymentId: string; description: string; amountCents: number; specialistStripeAccount?: string | null; feeCents: number };

export async function createCheckout(userEmail: string, items: CheckoutItem[]): Promise<{ url: string; providerRef: string | null }> {
  const ids = items.map((i) => i.paymentId).join(",");
  if (env.paymentProvider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("customer_email", userEmail);
    form.set("success_url", `${env.appUrl}/app/pay/result?ok=1&ids=${ids}`);
    form.set("cancel_url", `${env.appUrl}/app/pay/result?ok=0&ids=${ids}`);
    form.set("metadata[payment_ids]", ids);
    items.forEach((it, i) => {
      form.set(`line_items[${i}][quantity]`, "1");
      form.set(`line_items[${i}][price_data][currency]`, "eur");
      form.set(`line_items[${i}][price_data][unit_amount]`, String(it.amountCents));
      form.set(`line_items[${i}][price_data][product_data][name]`, it.description);
    });
    // Con un solo professionista collegato: destination charge con commissione di piattaforma.
    const dest = items[0]?.specialistStripeAccount;
    if (dest && items.every((i) => i.specialistStripeAccount === dest)) {
      form.set("payment_intent_data[application_fee_amount]", String(items.reduce((s, i) => s + i.feeCents, 0)));
      form.set("payment_intent_data[transfer_data][destination]", dest);
    }
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) throw new Error(`Stripe: ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { url: string; id: string };
    return { url: j.url, providerRef: j.id };
  }
  return { url: `/app/pay?ids=${ids}`, providerRef: null };
}

export async function refundExternal(providerRef: string | null, amountCents: number): Promise<{ ok: boolean; ref: string | null }> {
  if (env.paymentProvider === "stripe" && process.env.STRIPE_SECRET_KEY && providerRef?.startsWith("pi_")) {
    const form = new URLSearchParams({ payment_intent: providerRef, amount: String(amountCents) });
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    return { ok: res.ok, ref: res.ok ? ((await res.json()) as { id: string }).id : null };
  }
  return { ok: true, ref: `mock_re_${Date.now()}` };
}

/** Commissione di piattaforma e compenso netto dello specialista: sempre interi, fee + netto = importo. */
export function splitAmount(amountCents: number, feePct: number) {
  const fee = Math.round((amountCents * feePct) / 100);
  return { feeCents: fee, specialistNetCents: amountCents - fee };
}
