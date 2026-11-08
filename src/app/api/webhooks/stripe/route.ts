import { createHmac, timingSafeEqual } from "node:crypto";
import { completePayments, failPayments } from "@/server/booking";

/**
 * Webhook Stripe (T-03). Verifica la firma, poi conferma o fallisce i pagamenti collegati.
 * NON testato con un account Stripe reale: da collaudare in modalità test prima del lancio.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configurato", { status: 503 });
  const raw = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return new Response("Firma scaduta", { status: 400 });
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const given = parts.v1 ?? "";
  if (expected.length !== given.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return new Response("Firma non valida", { status: 400 });

  const event = JSON.parse(raw) as { type: string; data: { object: { metadata?: { payment_ids?: string }; payment_intent?: string } } };
  const ids = (event.data.object.metadata?.payment_ids ?? "").split(",").filter(Boolean);
  if (event.type === "checkout.session.completed") await completePayments(ids, event.data.object.payment_intent ?? null);
  else if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") await failPayments(ids, "Pagamento non riuscito");
  return Response.json({ received: true });
}
