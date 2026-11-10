import { safeEqual } from "@/lib/crypto";
import { sendReminders } from "@/server/booking";
import { expireCredits, runRetention } from "@/server/maintenance";
import { expireHolds } from "@/server/slotsDb";

/**
 * C-10: promemoria a 24 ore e a 1 ora. Va chiamato ogni 5-10 minuti da uno scheduler esterno
 * (cron del hosting, GitHub Actions, ecc.) con l'header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || !safeEqual(given, secret)) return new Response("Non autorizzato", { status: 401 });
  await expireHolds();
  const sent = await sendReminders();
  const expiredCredits = await expireCredits();
  const purged = await runRetention();
  return Response.json({ ok: true, sent, expiredCredits, purged });
}
