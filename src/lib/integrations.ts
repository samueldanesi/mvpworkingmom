import { desc, eq } from "drizzle-orm";
import { db, integrationLog } from "@/db";

/**
 * Integrazioni esterne SIMULATE per l'MVP (CRM, calendari Google/Outlook, SDI, Tessera Sanitaria, SMS, push, bonifici).
 * Nessuna chiamata di rete: ogni operazione "riesce" e viene registrata in integration_log, visibile da /admin/integrations.
 * Per il collegamento reale basta sostituire il corpo di queste funzioni.
 */
export type IntegrationKind = "crm" | "calendar_google" | "calendar_outlook" | "sdi" | "tessera_sanitaria" | "sms" | "push" | "payout";

export async function logIntegration(kind: IntegrationKind, ref: string | null, detail: string, status = "ok") {
  await db.insert(integrationLog).values({ kind, ref, detail, status });
}

const rnd = () => Math.random().toString(36).slice(2, 10);

/** T-07: invio simulato al Sistema di Interscambio (e, per le prestazioni sanitarie, al Sistema Tessera Sanitaria). */
export async function sendInvoiceToSdi(number: string, opts: { health?: boolean } = {}) {
  const ref = `SDI-${rnd()}`;
  await logIntegration("sdi", number, `Fattura ${number} inviata al Sistema di Interscambio (simulato). Esito: consegnata. Id ${ref}`);
  if (opts.health) await logIntegration("tessera_sanitaria", number, `Spesa sanitaria della fattura ${number} trasmessa al Sistema Tessera Sanitaria (simulato).`);
  return ref;
}

/** T-05: SMS e notifiche push simulati. */
export async function sendSms(phoneOrUser: string, text: string) {
  await logIntegration("sms", phoneOrUser, `SMS (simulato): ${text}`);
}
export async function sendPush(userId: string, text: string) {
  await logIntegration("push", userId, `Push (simulata): ${text}`);
}

/** S-09: bonifico allo specialista via Stripe Connect (simulato). */
export async function payoutToSpecialist(payoutId: string, netCents: number) {
  const ref = `mock_tr_${rnd()}`;
  await logIntegration("payout", payoutId, `Trasferimento Stripe Connect simulato di ${(netCents / 100).toFixed(2)} € (${ref})`);
  return ref;
}

/** C-02: sincronizzazione simulata con il CRM esterno (HubSpot / Go High Level). */
export async function syncCompanyToCrm(companyId: string, name: string, stage: string) {
  await logIntegration("crm", companyId, `Azienda «${name}» sincronizzata con il CRM (simulato), fase: ${stage}`);
}

/** S-04 / T-06: collegamento simulato del calendario dello specialista. */
export async function connectCalendar(specialistId: string, provider: "google" | "outlook") {
  await logIntegration(provider === "google" ? "calendar_google" : "calendar_outlook", specialistId, `Calendario ${provider === "google" ? "Google" : "Outlook"} collegato (simulato): gli appuntamenti confermati vengono copiati e le occupazioni bloccano gli slot.`);
}
export async function disconnectCalendar(specialistId: string, provider: "google" | "outlook") {
  await logIntegration(provider === "google" ? "calendar_google" : "calendar_outlook", specialistId, "Calendario scollegato", "disconnected");
}
export async function calendarState(specialistId: string, provider: "google" | "outlook") {
  const rows = await db.select().from(integrationLog).where(eq(integrationLog.ref, specialistId)).orderBy(desc(integrationLog.createdAt));
  const kind = provider === "google" ? "calendar_google" : "calendar_outlook";
  const l = rows.find((r) => r.kind === kind);
  return !!l && l.status === "ok";
}
