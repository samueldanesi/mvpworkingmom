"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { consents, db, subjects, tickets, ticketMessages, users } from "@/db";
import { pseudonymFor } from "@/lib/analytics";
import { checkPassword, endSession, requireUser } from "@/lib/auth";
import { DOC_VERSIONS } from "@/lib/constants";
import { done, fail, field, num } from "@/lib/flash";
import { createFamilyInvite, CodeError } from "@/server/codes";
import { eraseUser } from "@/server/gdpr";

export async function updateProfileAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const tz = field(fd, "timezone") || "Europe/Rome";
  try {
    new Intl.DateTimeFormat("it", { timeZone: tz });
  } catch {
    fail("/app/settings", "Fuso orario non valido.");
  }
  await db
    .update(users)
    .set({
      fullName: field(fd, "fullName") || u.fullName,
      phone: field(fd, "phone") || null,
      timezone: tz,
      gender: field(fd, "gender") || null,
      birthYear: num(fd, "birthYear") ?? null,
      site: field(fd, "site") || null,
      jobLevel: field(fd, "jobLevel") || null,
    })
    .where(eq(users.id, u.id));
  // gli attributi di segmentazione alimentano solo l'archivio analitico (pseudonimo)
  const p = await pseudonymFor(u.id);
  await db.update(subjects).set({ site: field(fd, "site") || null, jobLevel: field(fd, "jobLevel") || null, gender: field(fd, "gender") || null }).where(eq(subjects.pseudonym, p));
  done("/app/settings", "Dati aggiornati.");
}

/** U-17: gestione dei consensi; la revoca è sempre possibile. */
export async function setConsentAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const kind = field(fd, "kind") as "health_data" | "aggregate_use";
  const on = field(fd, "on") === "1";
  if (!["health_data", "aggregate_use"].includes(kind)) fail("/app/settings", "Consenso non valido.");
  if (on) {
    const [have] = await db.select().from(consents).where(and(eq(consents.userId, u.id), eq(consents.kind, kind), sql`${consents.revokedAt} is null`)).limit(1);
    if (!have) await db.insert(consents).values({ userId: u.id, kind, version: DOC_VERSIONS[kind] });
  } else {
    await db.update(consents).set({ revokedAt: new Date() }).where(and(eq(consents.userId, u.id), eq(consents.kind, kind), sql`${consents.revokedAt} is null`));
  }
  if (kind === "aggregate_use") {
    const p = await pseudonymFor(u.id);
    await db.update(subjects).set({ consentAggregate: on }).where(eq(subjects.pseudonym, p));
  }
  done("/app/settings", on ? "Consenso registrato." : "Consenso revocato.");
}

export async function createFamilyInviteAction() {
  const u = await requireUser({ roles: ["user"] });
  try {
    await createFamilyInvite(u.id);
  } catch (e) {
    if (e instanceof CodeError) fail("/app/settings", e.message);
    throw e;
  }
  done("/app/settings", "Codice familiare creato.");
}

export async function deleteAccountAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  if (!(await checkPassword(field(fd, "password"), u.passwordHash))) fail("/app/settings", "Password non corretta: l'account non è stato cancellato.");
  if (field(fd, "confirm").toUpperCase() !== "CANCELLA") fail("/app/settings", 'Scrivi "CANCELLA" per confermare.');
  await eraseUser(u.id, { id: u.id, role: u.role });
  await endSession();
  redirect("/?ok=" + encodeURIComponent("Account cancellato."));
}

/* ── assistenza (U-18) ── */

export async function createTicketAction(fd: FormData) {
  const u = await requireUser({ roles: ["user", "specialist"] });
  const subject = field(fd, "subject");
  const body = field(fd, "body");
  const base = u.role === "user" ? "/app/support" : "/specialist/support";
  if (!subject || !body) fail(base, "Compila oggetto e messaggio.");
  const [t] = await db.insert(tickets).values({ userId: u.id, subject, category: field(fd, "category") || "general", relatedAppointmentId: field(fd, "appointmentId") || null }).returning();
  await db.insert(ticketMessages).values({ ticketId: t.id, senderId: u.id, body });
  redirect(`${base}/${t.id}?ok=${encodeURIComponent("Richiesta inviata. Ti rispondiamo entro un giorno lavorativo.")}`);
}

export async function replyTicketAction(fd: FormData) {
  const u = await requireUser({ roles: ["user", "specialist"] });
  const id = field(fd, "id");
  const base = u.role === "user" ? "/app/support" : "/specialist/support";
  const [t] = await db.select().from(tickets).where(and(eq(tickets.id, id), eq(tickets.userId, u.id))).limit(1);
  if (!t) fail(base, "Richiesta non trovata.");
  const body = field(fd, "body");
  if (!body) fail(`${base}/${id}`, "Scrivi un messaggio.");
  await db.insert(ticketMessages).values({ ticketId: id, senderId: u.id, body });
  await db.update(tickets).set({ status: "open", closedAt: null }).where(eq(tickets.id, id));
  redirect(`${base}/${id}`);
}
