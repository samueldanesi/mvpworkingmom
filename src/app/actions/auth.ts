"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { consents, db, users } from "@/db";
import { audit } from "@/lib/audit";
import { ageBand, ensureSubject, track } from "@/lib/analytics";
import { checkPassword, endSession, getUser, hashPassword, readPre2fa, startPre2fa, startSession, validatePassword } from "@/lib/auth";
import { decryptText, encryptText } from "@/lib/crypto";
import { DOC_VERSIONS } from "@/lib/constants";
import { env, TWO_FA_ROLES } from "@/lib/env";
import { consumeToken, createAuthToken, findValidToken } from "@/lib/tokens";
import { fail, done, field } from "@/lib/flash";
import { sendMail } from "@/lib/mail";
import { homeFor } from "@/lib/permissions";
import { generateSecret, verifyTotp } from "@/lib/totp";

const MAX_FAILS = 5;
const LOCK_MIN = 15;

export async function registerAction(fd: FormData) {
  const email = z.string().email().safeParse(field(fd, "email").toLowerCase());
  const password = field(fd, "password");
  const fullName = field(fd, "fullName");
  if (!email.success) fail("/register", "Inserisci un indirizzo email valido.");
  if (!fullName) fail("/register", "Inserisci il tuo nome.");
  const pwErr = validatePassword(password);
  if (pwErr) fail("/register", pwErr);
  if (fd.get("terms") !== "on") fail("/register", "Per registrarti devi accettare Termini e Privacy.");

  const mail = email.data!;
  const [existing] = await db.select().from(users).where(eq(users.email, mail)).limit(1);
  if (!existing) {
    const gender = field(fd, "gender") || null;
    const birthYear = Number(field(fd, "birthYear")) || null;
    const [u] = await db
      .insert(users)
      .values({ email: mail, fullName, passwordHash: await hashPassword(password), gender, birthYear, role: "user" })
      .returning();
    await db.insert(consents).values([
      { userId: u.id, kind: "terms", version: DOC_VERSIONS.terms },
      { userId: u.id, kind: "privacy", version: DOC_VERSIONS.privacy },
    ]);
    await ensureSubject(u.id, { gender, ageBand: ageBand(birthYear) });
    await track(u.id, "registered");
    const token = await createAuthToken(u.id, "verify", 24);
    await sendMail("verify_email", mail, { name: fullName, link: `${env.appUrl}/verify?token=${token}` });
  }
  // Stessa risposta se l'email esiste già: nessuna enumerazione degli account.
  redirect(`/register/sent?email=${encodeURIComponent(mail)}`);
}

export async function verifyEmailAction(fd: FormData) {
  const token = field(fd, "token");
  const t = token ? await findValidToken(token, "verify") : null;
  if (!t) fail("/verify", "Il link non è valido o è scaduto. Richiedine uno nuovo dal login.");
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, t!.userId));
  await consumeToken(t!.id);
  done("/login", "Email confermata. Ora puoi accedere.");
}

export async function resendVerificationAction(fd: FormData) {
  const email = field(fd, "email").toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (u && !u.emailVerifiedAt && !u.deletedAt) {
    const token = await createAuthToken(u.id, "verify", 24);
    await sendMail("verify_email", email, { name: u.fullName ?? "", link: `${env.appUrl}/verify?token=${token}` });
  }
  done("/login", "Se l'indirizzo è registrato e non ancora confermato, ti abbiamo inviato un nuovo link.");
}

export async function loginAction(fd: FormData) {
  const email = field(fd, "email").toLowerCase();
  const password = field(fd, "password");
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const generic = "Email o password non corretti.";
  if (!u || u.deletedAt || u.status !== "active") {
    await checkPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv"); // tempo costante
    fail("/login", generic);
  }
  const user = u!;
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    fail("/login", `Troppi tentativi. Riprova tra qualche minuto.`);
  }
  const ok = await checkPassword(password, user.passwordHash);
  if (!ok) {
    const fails = user.failedLogins + 1;
    await db
      .update(users)
      .set({ failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60_000) : null })
      .where(eq(users.id, user.id));
    if (user.role !== "user") await audit({ id: user.id, role: user.role }, "login_failed");
    fail("/login", generic);
  }
  if (!user.emailVerifiedAt) {
    fail(`/login?unverified=${encodeURIComponent(email)}`, "Conferma prima la tua email: controlla la posta.");
  }
  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));

  if (user.totpEnabled) {
    await startPre2fa(user.id, user.role);
    redirect("/login/2fa");
  }
  await startSession(user.id, user.role);
  if (user.role !== "user") await audit({ id: user.id, role: user.role }, "login");
  redirect(homeFor(user.role));
}

export async function login2faAction(fd: FormData) {
  const sub = await readPre2fa();
  if (!sub) fail("/login", "Sessione scaduta. Accedi di nuovo.");
  const [u] = await db.select().from(users).where(eq(users.id, sub!)).limit(1);
  if (!u || !u.totpSecretEnc) fail("/login", "Accedi di nuovo.");
  if (u!.lockedUntil && u!.lockedUntil > new Date()) fail("/login", "Troppi tentativi. Riprova più tardi.");
  if (!verifyTotp(decryptText(u!.totpSecretEnc!), field(fd, "code"))) {
    const fails = u!.failedLogins + 1;
    await db.update(users).set({ failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60_000) : null }).where(eq(users.id, u!.id));
    fail("/login/2fa", "Codice non corretto.");
  }
  await db.update(users).set({ failedLogins: 0 }).where(eq(users.id, u!.id));
  await startSession(u!.id, u!.role);
  await audit({ id: u!.id, role: u!.role }, "login_2fa");
  redirect(homeFor(u!.role));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function forgotAction(fd: FormData) {
  const email = field(fd, "email").toLowerCase();
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (u && !u.deletedAt) {
    const token = await createAuthToken(u.id, "reset", 1);
    await sendMail("reset_password", email, { name: u.fullName ?? "", link: `${env.appUrl}/reset?token=${token}` });
  }
  done("/forgot", "Se l'indirizzo è registrato, riceverai un link per scegliere una nuova password.");
}

export async function resetAction(fd: FormData) {
  const token = field(fd, "token");
  const password = field(fd, "password");
  const t = token ? await findValidToken(token, "reset") : null;
  if (!t) fail("/forgot", "Il link non è valido o è scaduto. Richiedine uno nuovo.");
  const pwErr = validatePassword(password);
  if (pwErr) fail(`/reset?token=${encodeURIComponent(token)}`, pwErr);
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, t!.userId));
  await consumeToken(t!.id);
  done("/login", "Password aggiornata. Ora puoi accedere.");
}

/* ── 2FA (P-06): obbligatorio per specialisti, responsabile clinico e admin ── */

export async function begin2faAction() {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!u!.totpSecretEnc || !u!.totpEnabled) {
    await db.update(users).set({ totpSecretEnc: encryptText(generateSecret()), totpEnabled: false }).where(eq(users.id, u!.id));
  }
  redirect("/account/2fa");
}

export async function confirm2faAction(fd: FormData) {
  const u = await getUser();
  if (!u || !u.totpSecretEnc) redirect("/login");
  if (!verifyTotp(decryptText(u!.totpSecretEnc!), field(fd, "code"))) fail("/account/2fa", "Codice non corretto. Controlla l'ora del telefono e riprova.");
  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, u!.id));
  await audit({ id: u!.id, role: u!.role }, "2fa_enabled");
  redirect(homeFor(u!.role));
}

export async function disable2faAction() {
  const u = await getUser();
  if (!u) redirect("/login");
  if ((TWO_FA_ROLES as readonly string[]).includes(u!.role)) fail("/account/2fa", "Per il tuo ruolo il 2FA è obbligatorio.");
  await db.update(users).set({ totpEnabled: false, totpSecretEnc: null }).where(eq(users.id, u!.id));
  done("/account/2fa", "Verifica a due fattori disattivata.");
}
