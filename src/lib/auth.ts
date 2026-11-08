import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, users, type Role } from "@/db";
import { TWO_FA_ROLES, env } from "./env";
import { homeFor } from "./permissions";

const SESSION_COOKIE = "wm_session";
const PRE2FA_COOKIE = "wm_pre2fa";
const SESSION_HOURS = 8; // P-06: sessioni a tempo

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET mancante o troppo corto");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function checkPassword(pw: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "La password deve avere almeno 10 caratteri.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "La password deve contenere lettere e numeri.";
  return null;
}

async function sign(sub: string, role: Role, hours: number, purpose: "session" | "pre2fa") {
  return new SignJWT({ role, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

async function readToken(token: string | undefined, purpose: "session" | "pre2fa") {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== purpose || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function startSession(userId: string, role: Role) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sign(userId, role, SESSION_HOURS, "session"), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  jar.delete(PRE2FA_COOKIE);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PRE2FA_COOKIE);
}

export async function startPre2fa(userId: string, role: Role) {
  const jar = await cookies();
  jar.set(PRE2FA_COOKIE, await sign(userId, role, 0.1, "pre2fa"), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: 360,
  });
}

export async function readPre2fa(): Promise<string | null> {
  const jar = await cookies();
  return readToken(jar.get(PRE2FA_COOKIE)?.value, "pre2fa");
}

export const getUser = cache(async () => {
  const jar = await cookies();
  const sub = await readToken(jar.get(SESSION_COOKIE)?.value, "session");
  if (!sub) return null;
  const [u] = await db.select().from(users).where(eq(users.id, sub)).limit(1);
  if (!u || u.deletedAt || u.status !== "active") return null;
  return u;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export async function requireUser(opts: { roles?: Role[]; skip2fa?: boolean } = {}): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!opts.skip2fa && (TWO_FA_ROLES as readonly string[]).includes(u.role) && !u.totpEnabled) {
    redirect("/account/2fa");
  }
  if (opts.roles && !opts.roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}
