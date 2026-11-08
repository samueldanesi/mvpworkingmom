"use server";

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  accessCodes,
  appointments,
  clinicalReports,
  companies,
  companyInvoices,
  db,
  emailTemplates,
  gdprRequests,
  payments,
  payouts,
  safetyEvents,
  intakeProfiles,
  specialistProfiles,
  ticketMessages,
  tickets,
  users,
  type Role,
} from "@/db";
import { audit } from "@/lib/audit";
import { readableCode } from "@/lib/crypto";
import { env } from "@/lib/env";
import { done, fail, field, fields, num } from "@/lib/flash";
import { requireStaff } from "@/lib/guard";
import { sendMail } from "@/lib/mail";
import { createAuthToken } from "@/lib/tokens";
import { nextNumber, refundPayment } from "@/server/billing";
import { eraseUser } from "@/server/gdpr";
import { notify } from "@/server/notify";
import { setRules } from "@/server/settings";

/* ── aziende (B-01, B-02, C-02) ── */
export async function saveCompanyAction(fd: FormData) {
  const u = await requireStaff("companies.manage");
  const id = field(fd, "id");
  const name = field(fd, "name");
  if (!name) fail(id ? `/admin/companies/${id}` : "/admin/companies", "Inserisci la ragione sociale.");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const data = {
    name,
    vatNumber: field(fd, "vatNumber") || null,
    sdiCode: field(fd, "sdiCode") || null,
    pec: field(fd, "pec") || null,
    coveredEmployees: num(fd, "coveredEmployees") ?? 0,
    includedSessions: num(fd, "includedSessions") ?? 0,
    discountPct: Math.min(100, num(fd, "discountPct") ?? 0),
    coveredSpecialties: fields(fd, "coveredSpecialties"),
    familyMax: num(fd, "familyMax") ?? 0,
    familyDiscountPct: Math.min(100, num(fd, "familyDiscountPct") ?? 0),
    annualFeeCents: Math.round((num(fd, "annualFee") ?? 0) * 100),
    contractValueCents: Math.round((num(fd, "contractValue") ?? 0) * 100),
    startsAt: field(fd, "startsAt") ? new Date(field(fd, "startsAt")) : null,
    endsAt: field(fd, "endsAt") ? new Date(field(fd, "endsAt") + "T23:59:59") : null,
    status: field(fd, "status") || "active",
    pipelineStage: field(fd, "pipelineStage") || "lancio",
    accountOwner: field(fd, "accountOwner") || null,
  };
  if (id) {
    await db.update(companies).set(data).where(eq(companies.id, id));
    await audit(u, "company_updated", "company", id);
    done(`/admin/companies/${id}`, "Azienda aggiornata.");
  }
  try {
    const [c] = await db.insert(companies).values({ ...data, slug }).returning();
    await audit(u, "company_created", "company", c.id);
    redirect(`/admin/companies/${c.id}?ok=${encodeURIComponent("Azienda creata.")}`);
  } catch (e) {
    if ((e as { code?: string; cause?: { code?: string } })?.code === "23505" || (e as { cause?: { code?: string } })?.cause?.code === "23505") fail("/admin/companies", "Esiste già un'azienda con questo nome.");
    throw e;
  }
}

export async function adminCreateCodeAction(fd: FormData) {
  const u = await requireStaff("codes.manage");
  const companyId = field(fd, "companyId");
  const code = (field(fd, "code").toUpperCase().replace(/[^A-Z0-9]/g, "") || readableCode(8));
  try {
    await db.insert(accessCodes).values({ companyId, code, kind: "shared", maxUses: num(fd, "maxUses") ?? null, expiresAt: field(fd, "expiresAt") ? new Date(field(fd, "expiresAt") + "T23:59:59") : null });
  } catch {
    fail(`/admin/companies/${companyId}`, "Codice già esistente.");
  }
  await audit(u, "code_created", "company", companyId);
  done(`/admin/companies/${companyId}`, `Codice ${code} creato.`);
}

export async function adminRevokeCodeAction(fd: FormData) {
  const u = await requireStaff("codes.manage");
  const companyId = field(fd, "companyId");
  await db.update(accessCodes).set({ revokedAt: new Date() }).where(and(eq(accessCodes.id, field(fd, "id")), eq(accessCodes.companyId, companyId)));
  await audit(u, "code_revoked", "company", companyId);
  done(`/admin/companies/${companyId}`, "Codice revocato.");
}

/** Crea un utente di staff o un referente HR e invia il link per impostare la password. */
export async function inviteStaffAction(fd: FormData) {
  const u = await requireStaff("staff.manage");
  const back = field(fd, "back") || "/admin/settings";
  const email = z.string().email().safeParse(field(fd, "email").toLowerCase());
  const role = field(fd, "role") as Role;
  if (!email.success || !["admin", "clinical_lead", "hr"].includes(role)) fail(back, "Email o ruolo non validi.");
  const companyId = role === "hr" ? field(fd, "companyId") : "";
  if (role === "hr" && !companyId) fail(back, "Per un referente HR serve l'azienda.");
  const [exists] = await db.select().from(users).where(eq(users.email, email.data!)).limit(1);
  if (exists) fail(back, "Esiste già un utente con questa email.");
  const [nu] = await db.insert(users).values({ email: email.data!, fullName: field(fd, "fullName") || null, role, companyId: companyId || null, emailVerifiedAt: new Date() }).returning();
  const token = await createAuthToken(nu.id, "reset", 72);
  const [co] = companyId ? await db.select().from(companies).where(eq(companies.id, companyId)).limit(1) : [];
  await sendMail("hr_invite", nu.email, { name: nu.fullName ?? "", company: co?.name ?? "Working Mom", link: `${env.appUrl}/reset?token=${token}` });
  await audit(u, "staff_invited", "user", nu.id, role);
  done(back, "Invito inviato.");
}

export async function changeRoleAction(fd: FormData) {
  const u = await requireStaff("staff.manage");
  const id = field(fd, "id");
  const role = field(fd, "role") as Role;
  if (id === u.id) fail("/admin/settings", "Non puoi cambiare il tuo ruolo.");
  if (!["admin", "clinical_lead", "user"].includes(role)) fail("/admin/settings", "Ruolo non valido.");
  await db.update(users).set({ role }).where(eq(users.id, id));
  await audit(u, "role_changed", "user", id, role);
  done("/admin/settings", "Ruolo aggiornato.");
}

export async function saveRulesAction(fd: FormData) {
  const u = await requireStaff("staff.manage");
  const cancelNoticeHours = num(fd, "cancelNoticeHours") ?? 24;
  const platformFeePct = num(fd, "platformFeePct") ?? 30;
  const kMin = num(fd, "kMin") ?? 10;
  if (cancelNoticeHours < 0 || cancelNoticeHours > 168 || platformFeePct < 0 || platformFeePct > 60 || kMin < 5 || kMin > 100) fail("/admin/settings", "Valori fuori intervallo (preavviso 0-168 h, commissione 0-60%, soglia anonimato 5-100).");
  await setRules({ cancelNoticeHours, platformFeePct, kMin });
  await audit(u, "rules_updated", "settings", "business_rules", `${cancelNoticeHours}h / ${platformFeePct}% / N=${kMin}`);
  done("/admin/settings", "Regole aggiornate. Valgono per le nuove prenotazioni e per i nuovi report.");
}

/* ── utenti: accesso ai dati personali sempre motivato e registrato (C-08) ── */
export async function setUserStatusAction(fd: FormData) {
  const u = await requireStaff("users.view");
  const id = field(fd, "id");
  const status = field(fd, "status") === "suspended" ? "suspended" : "active";
  await db.update(users).set({ status }).where(eq(users.id, id));
  await audit(u, `user_${status}`, "user", id, field(fd, "reason"));
  done(`/admin/users/${id}?reason=${encodeURIComponent(field(fd, "reason") || "supporto")}`, "Stato aggiornato.");
}

/* ── specialisti (S-01, S-03, C-05) ── */
export async function setSpecialistStatusAction(fd: FormData) {
  const u = await requireStaff("specialists.review");
  const id = field(fd, "id");
  const status = field(fd, "status") as "received" | "reviewing" | "interview" | "approved" | "rejected" | "suspended";
  if (!["received", "reviewing", "interview", "approved", "rejected", "suspended"].includes(status)) fail("/admin/specialists", "Stato non valido.");
  const note = field(fd, "note") || null;
  await db
    .update(specialistProfiles)
    .set({ status, statusNote: note, approvedAt: status === "approved" ? new Date() : null, published: status === "approved" ? sql`${specialistProfiles.published}` : false })
    .where(eq(specialistProfiles.userId, id));
  const [s] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  await sendMail("specialist_status", s.email, { name: s.fullName ?? "", status, detail: note ?? "" });
  await audit(u, "specialist_status", "user", id, status);
  done("/admin/specialists", "Stato aggiornato: lo specialista è stato avvisato.");
}

export async function publishSpecialistAction(fd: FormData) {
  const u = await requireStaff("specialists.review");
  const id = field(fd, "id");
  const publish = field(fd, "publish") === "1";
  const [p] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, id)).limit(1);
  if (publish && p.status !== "approved") fail("/admin/specialists", "Si pubblicano solo gli specialisti approvati.");
  await db.update(specialistProfiles).set({ published: publish }).where(eq(specialistProfiles.userId, id));
  await audit(u, publish ? "specialist_published" : "specialist_unpublished", "user", id);
  done("/admin/specialists", publish ? "Profilo pubblicato." : "Profilo ritirato.");
}

export async function reviewProfileChangesAction(fd: FormData) {
  const u = await requireStaff("specialists.review");
  const id = field(fd, "id");
  const approve = field(fd, "decision") === "approve";
  const [p] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, id)).limit(1);
  if (!p?.pendingChanges) fail("/admin/specialists", "Nessuna modifica in attesa.");
  if (approve) {
    const c = p!.pendingChanges as Record<string, unknown>;
    await db.update(specialistProfiles).set({ ...c, pendingChanges: null, pendingSubmittedAt: null } as Partial<typeof specialistProfiles.$inferInsert>).where(eq(specialistProfiles.userId, id));
  } else {
    await db.update(specialistProfiles).set({ pendingChanges: null, pendingSubmittedAt: null }).where(eq(specialistProfiles.userId, id));
  }
  await notify(id, approve ? "Le modifiche al tuo profilo sono state approvate e pubblicate." : "Le modifiche al tuo profilo non sono state approvate.", "/specialist/profile");
  await audit(u, approve ? "profile_approved" : "profile_rejected", "user", id);
  done("/admin/specialists", approve ? "Modifiche pubblicate." : "Modifiche respinte.");
}

/* ── assistenza (C-06) ── */
export async function staffReplyTicketAction(fd: FormData) {
  const u = await requireStaff("tickets.handle");
  const id = field(fd, "id");
  const body = field(fd, "body");
  if (!body) fail(`/admin/support/${id}`, "Scrivi una risposta.");
  const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  await db.insert(ticketMessages).values({ ticketId: id, senderId: u.id, fromStaff: true, body });
  await db.update(tickets).set({ status: "pending", firstResponseAt: t.firstResponseAt ?? new Date() }).where(eq(tickets.id, id));
  if (t.userId) await notify(t.userId, "Abbiamo risposto alla tua richiesta di assistenza.", `/app/support/${id}`);
  done(`/admin/support/${id}`, "Risposta inviata.");
}

export async function closeTicketAction(fd: FormData) {
  await requireStaff("tickets.handle");
  const id = field(fd, "id");
  await db.update(tickets).set({ status: "closed", closedAt: new Date() }).where(eq(tickets.id, id));
  done(`/admin/support/${id}`, "Richiesta chiusa.");
}

export async function adminRefundAction(fd: FormData) {
  const u = await requireStaff("tickets.handle");
  const paymentId = field(fd, "paymentId");
  const back = field(fd, "back") || "/admin/support";
  const euro = num(fd, "amount");
  const r = await refundPayment(paymentId, euro !== undefined ? Math.round(euro * 100) : undefined);
  await audit(u, "refund", "payment", paymentId, field(fd, "reason"));
  if (!r.ok) fail(back, r.message ?? "Rimborso non riuscito.");
  done(back, "Rimborso eseguito.");
}

/* ── finanza (C-07) ── */
export async function generatePayoutsAction(fd: FormData) {
  const u = await requireStaff("payouts.run");
  const from = field(fd, "from");
  const to = field(fd, "to");
  if (!from || !to) fail("/admin/finance", "Scegli il periodo.");
  const rows = await db
    .select({ p: payments, a: appointments })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(and(sql`${payments.status} in ('paid','partially_refunded')`, sql`${payments.payoutId} is null`, sql`${appointments.status} in ('completed','no_show_user','cancelled_late')`, gte(appointments.startsAt, new Date(from)), lte(appointments.startsAt, new Date(to + "T23:59:59"))));
  const bySpec = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.p.specialistId) continue;
    (bySpec.get(r.p.specialistId) ?? bySpec.set(r.p.specialistId, []).get(r.p.specialistId)!).push(r);
  }
  let n = 0;
  for (const [specialistId, list] of bySpec) {
    const gross = list.reduce((s, r) => s + (r.p.amountCents - r.p.refundedCents), 0);
    const fee = list.reduce((s, r) => s + r.p.feeCents, 0);
    const net = list.reduce((s, r) => s + r.p.specialistNetCents, 0);
    const [po] = await db.insert(payouts).values({ specialistId, periodStart: from, periodEnd: to, sessionsCount: list.length, grossCents: gross, feeCents: fee, netCents: net }).returning();
    await db.update(payments).set({ payoutId: po.id }).where(inArray(payments.id, list.map((r) => r.p.id)));
    n++;
  }
  await audit(u, "payouts_generated", "payout", undefined, `${from} → ${to}`);
  done("/admin/finance", n ? `${n} pagamenti generati.` : "Nessuna seduta da liquidare nel periodo.");
}

export async function markPayoutPaidAction(fd: FormData) {
  const u = await requireStaff("payouts.run");
  await db.update(payouts).set({ status: "paid", paidAt: new Date(), providerRef: `mock_tr_${Date.now()}` }).where(eq(payouts.id, field(fd, "id")));
  await audit(u, "payout_paid", "payout", field(fd, "id"));
  done("/admin/finance", "Segnato come pagato (in produzione: trasferimento Stripe Connect).");
}

export async function createCompanyInvoiceAction(fd: FormData) {
  const u = await requireStaff("finance.view");
  const companyId = field(fd, "companyId");
  const amount = Math.round((num(fd, "amount") ?? 0) * 100);
  const kind = field(fd, "kind") === "credit_note" ? "credit_note" : "invoice";
  if (!companyId || amount <= 0) fail("/admin/finance", "Azienda e importo sono obbligatori.");
  await db.insert(companyInvoices).values({ companyId, number: await nextNumber("CE"), kind, amountCents: kind === "credit_note" ? -amount : amount, description: field(fd, "description") || (kind === "invoice" ? "Canone programma Working Mom" : "Nota di credito") });
  await audit(u, "company_invoice", "company", companyId);
  done("/admin/finance", "Documento registrato (l'invio SDI richiede il fornitore di fatturazione elettronica).");
}

/* ── qualità clinica (C-11) ── */
export async function handleReportAction(fd: FormData) {
  const u = await requireStaff("clinical.reports");
  const id = field(fd, "id");
  const status = (["in_review", "closed"].includes(field(fd, "status")) ? field(fd, "status") : "in_review") as "in_review" | "closed";
  await db.update(clinicalReports).set({ status, handledBy: u.id, outcome: field(fd, "outcome") || null }).where(eq(clinicalReports.id, id));
  await audit(u, "clinical_report_handled", "clinical_report", id, status);
  done("/admin/clinical", "Segnalazione aggiornata.");
}

export async function clearSafetyAction(fd: FormData) {
  const u = await requireStaff("safety.clear");
  const id = field(fd, "id");
  const [ev] = await db.select().from(safetyEvents).where(eq(safetyEvents.id, id)).limit(1);
  if (!ev) fail("/admin/clinical", "Evento non trovato.");
  await db.update(safetyEvents).set({ clearedAt: new Date(), clearedBy: u.id }).where(eq(safetyEvents.id, id));
  await db.update(intakeProfiles).set({ safetyFlag: false }).where(eq(intakeProfiles.userId, ev!.userId));
  await notify(ev!.userId, "Puoi riprendere la prenotazione. Se hai bisogno di aiuto urgente usa sempre i numeri di emergenza.", "/app");
  await audit(u, "safety_cleared", "user", ev!.userId, field(fd, "reason") || "valutazione clinica");
  done("/admin/clinical", "Blocco rimosso: l'utente può riprendere.");
}

/* ── GDPR (C-09) ── */
export async function createGdprRequestAction(fd: FormData) {
  const u = await requireStaff("gdpr.handle");
  const email = field(fd, "email").toLowerCase();
  const [t] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const kind = field(fd, "kind") as "access" | "rectify" | "erase" | "export";
  if (!["access", "rectify", "erase", "export"].includes(kind)) fail("/admin/gdpr", "Tipo non valido.");
  await db.insert(gdprRequests).values({ userId: t?.id ?? null, userEmail: email, kind, dueAt: new Date(Date.now() + 30 * 86_400_000), note: field(fd, "note") || null });
  await audit(u, "gdpr_request_created", "gdpr", undefined, kind);
  done("/admin/gdpr", "Richiesta registrata (scadenza: 30 giorni).");
}

export async function closeGdprRequestAction(fd: FormData) {
  const u = await requireStaff("gdpr.handle");
  const id = field(fd, "id");
  const status = field(fd, "status") === "rejected" ? "rejected" : "done";
  const [r] = await db.select().from(gdprRequests).where(eq(gdprRequests.id, id)).limit(1);
  if (status === "done" && r?.kind === "erase" && r.userId) await eraseUser(r.userId, { id: u.id, role: u.role });
  await db.update(gdprRequests).set({ status, closedAt: new Date(), note: field(fd, "note") || r?.note }).where(eq(gdprRequests.id, id));
  await audit(u, "gdpr_request_closed", "gdpr", id, status);
  done("/admin/gdpr", "Richiesta chiusa.");
}

/* ── email (C-10) ── */
export async function saveTemplateAction(fd: FormData) {
  const u = await requireStaff("templates.edit");
  const key = field(fd, "key");
  await db.insert(emailTemplates).values({ key, subject: field(fd, "subject"), body: field(fd, "body") }).onConflictDoUpdate({ target: emailTemplates.key, set: { subject: field(fd, "subject"), body: field(fd, "body"), updatedAt: new Date() } });
  await audit(u, "template_saved", "template", key);
  done("/admin/emails", "Modello salvato.");
}
