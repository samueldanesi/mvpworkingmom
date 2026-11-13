"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { availabilityExceptions, availabilityRules, clinicalReports, consents, db, sessionNotes, specialistDocuments, specialistProfiles, users } from "@/db";
import { hashPassword, requireUser, validatePassword } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";
import { DOC_VERSIONS } from "@/lib/constants";
import { createAuthToken } from "@/lib/tokens";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { done, fail, field, fields, num } from "@/lib/flash";
import { hmToMin } from "@/lib/format";
import { checkUpload, saveEncrypted } from "@/lib/storage";
import { BookingError, cancelAppointment, markOutcome } from "@/server/booking";
import { getProfile } from "@/server/specialist";

/* ── S-01: candidatura pubblica ── */
export async function applyAction(fd: FormData) {
  const email = field(fd, "email").toLowerCase();
  const password = field(fd, "password");
  const name = field(fd, "fullName");
  if (!email || !name) fail("/specialists/apply", "Compila nome ed email.");
  const pwErr = validatePassword(password);
  if (pwErr) fail("/specialists/apply", pwErr);
  const registryNumber = field(fd, "registryNumber");
  const registryName = field(fd, "registryName");
  const rc = field(fd, "rcPolicyNumber");
  if (!registryName || !registryNumber || !rc) fail("/specialists/apply", "Albo, numero di iscrizione e polizza RC sono obbligatori.");
  const files = fd.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) fail("/specialists/apply", "Allega almeno titolo di studio e curriculum.");
  for (const f of files) {
    const e = checkUpload(f);
    if (e) fail("/specialists/apply", e);
  }
  const [exists] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (exists) redirect("/specialists/apply?ok=" + encodeURIComponent("Candidatura ricevuta. Se hai già un account accedi: ti contatteremo via email."));
  const [u] = await db.insert(users).values({ email, fullName: name, passwordHash: await hashPassword(password), role: "specialist", phone: field(fd, "phone") || null }).returning();
  await db.insert(specialistProfiles).values({
    userId: u.id,
    title: field(fd, "title"),
    cvText: field(fd, "cv"),
    registryName,
    registryNumber,
    rcPolicyNumber: rc,
    specializations: fields(fd, "specializations"),
    languages: fields(fd, "languages").length ? fields(fd, "languages") : ["it"],
  });
  for (const f of files) {
    await db.insert(specialistDocuments).values({ specialistId: u.id, kind: "application", filename: f.name.slice(0, 120), mime: f.type, size: f.size, storageKey: await saveEncrypted(Buffer.from(await f.arrayBuffer())) });
  }
  const token = await createAuthToken(u.id, "verify", 72);
  await sendMail("verify_email", email, { name, link: `${env.appUrl}/verify?token=${token}` });
  redirect("/register/sent?email=" + encodeURIComponent(email));
}

/* ── S-02: accettazione elettronica ── */
export async function acceptContractAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  if (fd.get("contract") !== "on" || fd.get("conduct") !== "on" || fd.get("privacy") !== "on") fail("/specialist", "Devi accettare contratto, codice di condotta e informativa.");
  await db.insert(consents).values([
    { userId: u.id, kind: "specialist_contract", version: DOC_VERSIONS.specialist_contract },
    { userId: u.id, kind: "code_of_conduct", version: DOC_VERSIONS.code_of_conduct },
    { userId: u.id, kind: "privacy", version: DOC_VERSIONS.privacy },
  ]);
  done("/specialist", "Accettazione registrata.");
}

/* ── S-03: modifiche del profilo passano da approvazione ── */
export async function submitProfileAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const p = await getProfile(u.id);
  if (!p) fail("/specialist/profile", "Profilo non trovato.");
  const price = Math.round((num(fd, "price") ?? 0) * 100);
  if (price < 1000 || price > 30000) fail("/specialist/profile", "La tariffa deve essere tra 10 € e 300 €.");
  // Foto (U-07/S-03): solo immagini, fino a 2 MB; la nuova foto passa da approvazione come ogni altra modifica.
  const photo = fd.get("photo");
  let photoUrl: string | null | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) fail("/specialist/profile", "La foto deve essere JPG, PNG o WebP.");
    if (photo.size > 2 * 1024 * 1024) fail("/specialist/profile", "La foto supera i 2 MB.");
    photoUrl = await saveEncrypted(Buffer.from(await photo.arrayBuffer()));
  }
  const changes = {
    ...(photoUrl ? { photoUrl } : {}),
    title: field(fd, "title"),
    bio: field(fd, "bio"),
    approach: field(fd, "approach"),
    specializations: fields(fd, "specializations"),
    languages: fields(fd, "languages"),
    gender: field(fd, "gender") || null,
    ageGroups: fields(fd, "ageGroups"),
    responseHours: field(fd, "responseHours"),
    sessionMinutes: num(fd, "sessionMinutes") ?? 50,
    priceCents: price,
    weeklyCapacity: num(fd, "weeklyCapacity") ?? 15,
  };
  if (p!.status !== "approved") {
    await db.update(specialistProfiles).set({ ...changes }).where(eq(specialistProfiles.userId, u.id));
    done("/specialist/profile", "Dati salvati.");
  }
  await db.update(specialistProfiles).set({ pendingChanges: changes, pendingSubmittedAt: new Date() }).where(eq(specialistProfiles.userId, u.id));
  done("/specialist/profile", "Modifiche inviate: saranno pubblicate dopo l'approvazione del responsabile clinico.");
}

/* ── S-04: agenda ── */
export async function addAvailabilityAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const weekday = num(fd, "weekday") ?? 1;
  const start = hmToMin(field(fd, "start"));
  const end = hmToMin(field(fd, "end"));
  const kind = field(fd, "kind") === "intro" ? "intro" : "session";
  if (!(end > start)) fail("/specialist/agenda", "L'ora di fine deve essere dopo l'inizio.");
  await db.insert(availabilityRules).values({ specialistId: u.id, weekday, startMin: start, endMin: end, kind });
  done("/specialist/agenda", "Disponibilità aggiunta.");
}

export async function removeAvailabilityAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  await db.delete(availabilityRules).where(and(eq(availabilityRules.id, field(fd, "id")), eq(availabilityRules.specialistId, u.id)));
  redirect("/specialist/agenda");
}

export async function addExceptionAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const day = field(fd, "day");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail("/specialist/agenda", "Data non valida.");
  await db.insert(availabilityExceptions).values({ specialistId: u.id, day, note: field(fd, "note") || null });
  done("/specialist/agenda", "Giorno libero aggiunto.");
}

export async function removeExceptionAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  await db.delete(availabilityExceptions).where(and(eq(availabilityExceptions.id, field(fd, "id")), eq(availabilityExceptions.specialistId, u.id)));
  redirect("/specialist/agenda");
}

/* ── S-06: esito, S-07: note cifrate ── */
export async function outcomeAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const id = field(fd, "id");
  const outcome = field(fd, "outcome") as "completed" | "no_show_user" | "cancelled_late";
  if (!["completed", "no_show_user", "cancelled_late"].includes(outcome)) fail("/specialist/agenda", "Esito non valido.");
  try {
    await markOutcome(id, u.id, outcome, field(fd, "note"));
  } catch (e) {
    if (e instanceof BookingError) fail(`/specialist/appointments/${id}`, e.message);
    throw e;
  }
  done(`/specialist/appointments/${id}`, "Esito registrato.");
}

export async function specialistCancelAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const id = field(fd, "id");
  try {
    await cancelAppointment(id, { id: u.id, role: u.role });
  } catch (e) {
    if (e instanceof BookingError) fail(`/specialist/appointments/${id}`, e.message);
    throw e;
  }
  done("/specialist/agenda", "Appuntamento annullato: l'utente viene avvisato e rimborsato.");
}

export async function saveNoteAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const id = field(fd, "appointmentId");
  const userId = field(fd, "userId");
  const content = field(fd, "content");
  await db
    .insert(sessionNotes)
    .values({ appointmentId: id, specialistId: u.id, userId, contentEnc: encryptText(content) })
    .onConflictDoUpdate({ target: sessionNotes.appointmentId, set: { contentEnc: encryptText(content), updatedAt: new Date() }, setWhere: eq(sessionNotes.specialistId, u.id) });
  done(`/specialist/appointments/${id}`, "Nota salvata (cifrata, visibile solo a te).");
}

/* ── S-11: segnalazione al responsabile clinico ── */
export async function reportAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const body = field(fd, "body");
  if (!body) fail("/specialist/reports", "Descrivi la segnalazione.");
  const severity = (["info", "warning", "urgent"].includes(field(fd, "severity")) ? field(fd, "severity") : "info") as "info" | "warning" | "urgent";
  await db.insert(clinicalReports).values({ specialistId: u.id, userId: field(fd, "userId") || null, severity, bodyEnc: encryptText(body) });
  done("/specialist/reports", "Segnalazione inviata al responsabile clinico.");
}
