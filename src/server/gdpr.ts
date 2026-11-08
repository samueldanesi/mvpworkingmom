import { and, eq, inArray, or } from "drizzle-orm";
import {
  appointments,
  attachments,
  authTokens,
  clinicalReports,
  consents,
  db,
  familyInvites,
  gdprRequests,
  intakeProfiles,
  invoices,
  messages,
  notifications,
  payments,
  pseudonymMap,
  responses,
  safetyEvents,
  sessionNotes,
  subjects,
  threads,
  users,
} from "@/db";
import { audit } from "@/lib/audit";
import { decryptJson, decryptText } from "@/lib/crypto";
import { removeFile } from "@/lib/storage";
import { cancelAppointment } from "./booking";

/** P-11 / U-17: accesso ed esportazione dei dati personali. */
export async function exportUserData(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [intake] = await db.select().from(intakeProfiles).where(eq(intakeProfiles.userId, userId)).limit(1);
  const [map] = await db.select().from(pseudonymMap).where(eq(pseudonymMap.userId, userId)).limit(1);
  const ths = await db.select().from(threads).where(eq(threads.userId, userId));
  const msgs = ths.length
    ? await db.select().from(messages).where(inArray(messages.threadId, ths.map((t) => t.id)))
    : [];
  return {
    generatedAt: new Date().toISOString(),
    profile: u && { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, timezone: u.timezone, gender: u.gender, birthYear: u.birthYear, site: u.site, jobLevel: u.jobLevel, createdAt: u.createdAt },
    consents: await db.select().from(consents).where(eq(consents.userId, userId)),
    questionnaire: intake ? decryptJson(intake.dataEnc) : null,
    appointments: await db.select().from(appointments).where(eq(appointments.userId, userId)),
    payments: await db.select().from(payments).where(eq(payments.userId, userId)),
    invoices: await db.select().from(invoices).where(eq(invoices.userId, userId)),
    messages: msgs.map((m) => ({ at: m.createdAt, fromMe: m.senderId === userId, text: decryptText(m.bodyEnc) })),
    checkins: map ? await db.select().from(responses).where(eq(responses.pseudonym, map.pseudonym)) : [],
  };
}

/**
 * P-11 / scenario 10: cancellazione dell'account. Si rimuovono i dati personali; restano le fatture
 * (obbligo di conservazione) e gli appunti professionali dello specialista (scollegati dall'utente).
 * I report aggregati già emessi non cambiano: il legame utente -> pseudonimo viene distrutto.
 */
export async function eraseUser(userId: string, actor: { id: string; role: string } | null) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.deletedAt) return;

  const future = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId), or(eq(appointments.status, "booked"), eq(appointments.status, "pending_payment"))));
  for (const a of future) await cancelAppointment(a.id, { id: userId, role: "user" }, { force: true }).catch(() => {});

  const ths = await db.select().from(threads).where(eq(threads.userId, userId));
  if (ths.length) {
    const msgs = await db.select({ id: messages.id }).from(messages).where(inArray(messages.threadId, ths.map((t) => t.id)));
    if (msgs.length) {
      const atts = await db.select().from(attachments).where(inArray(attachments.messageId, msgs.map((m) => m.id)));
      for (const a of atts) await removeFile(a.storageKey);
      await db.delete(attachments).where(inArray(attachments.messageId, msgs.map((m) => m.id)));
      await db.delete(messages).where(inArray(messages.id, msgs.map((m) => m.id)));
    }
    await db.delete(threads).where(inArray(threads.id, ths.map((t) => t.id)));
  }
  await db.delete(intakeProfiles).where(eq(intakeProfiles.userId, userId));
  await db.delete(safetyEvents).where(eq(safetyEvents.userId, userId));
  await db.update(sessionNotes).set({ userId: null, retained: true }).where(eq(sessionNotes.userId, userId));
  await db.update(clinicalReports).set({ userId: null }).where(eq(clinicalReports.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(authTokens).where(eq(authTokens.userId, userId));
  await db.delete(familyInvites).where(eq(familyInvites.employeeId, userId));

  // scollega l'archivio analitico: restano solo dati anonimi
  const [map] = await db.select().from(pseudonymMap).where(eq(pseudonymMap.userId, userId)).limit(1);
  if (map) {
    await db.update(subjects).set({ consentAggregate: false }).where(eq(subjects.pseudonym, map.pseudonym));
    await db.delete(pseudonymMap).where(eq(pseudonymMap.userId, userId));
  }

  await db
    .update(users)
    .set({
      email: `deleted-${u.id}@deleted.invalid`,
      fullName: null,
      phone: null,
      passwordHash: null,
      totpSecretEnc: null,
      totpEnabled: false,
      gender: null,
      birthYear: null,
      site: null,
      jobLevel: null,
      companyId: null,
      coverageKind: null,
      accessCodeId: null,
      status: "deleted",
      deletedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await db.insert(gdprRequests).values({ userId, userEmail: "(cancellato)", kind: "erase", status: "done", dueAt: new Date(), closedAt: new Date(), note: actor && actor.id !== userId ? "Eseguita dal backoffice" : "Self-service" });
  await audit(actor ?? { id: userId, role: "user" }, "account_erased", "user", userId);
}
