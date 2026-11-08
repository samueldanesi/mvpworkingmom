import { and, count, eq, sql } from "drizzle-orm";
import { accessCodes, companies, creditLedger, db, familyInvites, users } from "@/db";
import { ensureSubject } from "@/lib/analytics";
import { readableCode } from "@/lib/crypto";

export type Coverage = {
  companyName: string;
  kind: "employee" | "family";
  includedSessions: number;
  discountPct: number;
  specialties: string[];
  endsAt: Date | null;
};

export class CodeError extends Error {}

const GENERIC = "Codice non valido o non utilizzabile. Controlla di averlo scritto bene o chiedi un nuovo codice al tuo referente.";

/** U-02 / scenario 3: controlla validità, scadenza, revoca, dominio email ammesso e posti residui. */
export async function validateCode(codeRaw: string, email: string) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) throw new CodeError("Inserisci un codice.");

  if (code.startsWith("FAM-")) {
    const [inv] = await db.select().from(familyInvites).where(eq(familyInvites.code, code)).limit(1);
    if (!inv || inv.usedBy) throw new CodeError(GENERIC);
    const [co] = await db.select().from(companies).where(eq(companies.id, inv.companyId)).limit(1);
    assertCompanyActive(co);
    return { kind: "family" as const, company: co, invite: inv, code: null };
  }

  const [c] = await db.select().from(accessCodes).where(eq(accessCodes.code, code)).limit(1);
  if (!c || c.revokedAt) throw new CodeError(GENERIC);
  if (c.expiresAt && c.expiresAt < new Date()) throw new CodeError("Questo codice è scaduto. Chiedi un nuovo codice al tuo referente.");
  if (c.maxUses !== null && c.usedCount >= c.maxUses) throw new CodeError("Questo codice è già stato utilizzato.");
  const [co] = await db.select().from(companies).where(eq(companies.id, c.companyId)).limit(1);
  assertCompanyActive(co);

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (co.allowedDomains.length && !co.allowedDomains.includes(domain) && !co.allowPersonalEmail) {
    throw new CodeError("Per usare questo codice serve l'email aziendale.");
  }
  if (co.coveredEmployees > 0) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.companyId, co.id), eq(users.coverageKind, "employee")));
    if (n >= co.coveredEmployees) throw new CodeError("Il budget di questo programma è esaurito. Contatta il tuo referente HR.");
  }
  return { kind: "employee" as const, company: co, invite: null, code: c };
}

function assertCompanyActive(co: typeof companies.$inferSelect | undefined): asserts co is typeof companies.$inferSelect {
  if (!co || co.status !== "active") throw new CodeError(GENERIC);
  const now = new Date();
  if (co.startsAt && co.startsAt > now) throw new CodeError("Il programma non è ancora attivo.");
  if (co.endsAt && co.endsAt < now) throw new CodeError("Il programma della tua azienda è scaduto.");
}

export async function redeemCode(userId: string, email: string, codeRaw: string): Promise<Coverage> {
  const v = await validateCode(codeRaw, email);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (u?.companyId) throw new CodeError("Hai già attivato un codice.");

  await db.transaction(async (tx) => {
    if (v.kind === "family") {
      await tx.update(familyInvites).set({ usedBy: userId }).where(eq(familyInvites.id, v.invite!.id));
      await tx
        .update(users)
        .set({ companyId: v.company.id, coverageKind: "family", familyOfUserId: v.invite!.employeeId })
        .where(eq(users.id, userId));
    } else {
      await tx.update(accessCodes).set({ usedCount: sql`${accessCodes.usedCount} + 1` }).where(eq(accessCodes.id, v.code!.id));
      await tx
        .update(users)
        .set({ companyId: v.company.id, coverageKind: "employee", accessCodeId: v.code!.id })
        .where(eq(users.id, userId));
      if (v.company.includedSessions > 0) {
        await tx.insert(creditLedger).values({
          companyId: v.company.id,
          userId,
          delta: v.company.includedSessions,
          reason: "grant",
          note: "Sedute incluse nel programma",
        });
      }
    }
  });
  await ensureSubject(userId, { companyId: v.company.id, site: u?.site ?? null, jobLevel: u?.jobLevel ?? null });
  return coverageOf(v.company, v.kind);
}

export function coverageOf(co: typeof companies.$inferSelect, kind: "employee" | "family"): Coverage {
  return {
    companyName: co.name,
    kind,
    includedSessions: kind === "employee" ? co.includedSessions : 0,
    discountPct: kind === "employee" ? co.discountPct : co.familyDiscountPct,
    specialties: co.coveredSpecialties,
    endsAt: co.endsAt,
  };
}

export async function findCompanyByDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const all = await db.select().from(companies).where(eq(companies.status, "active"));
  return all.find((c) => c.allowedDomains.includes(domain)) ?? null;
}

/** U-02: riconoscimento del dominio aziendale, senza digitare il codice (usa il primo codice condiviso attivo). */
export async function redeemByDomain(userId: string, email: string) {
  const co = await findCompanyByDomain(email);
  if (!co) throw new CodeError("Dominio email non riconosciuto.");
  const codes = await db.select().from(accessCodes).where(and(eq(accessCodes.companyId, co.id), eq(accessCodes.kind, "shared")));
  const ok = codes.find((c) => !c.revokedAt && (!c.expiresAt || c.expiresAt > new Date()));
  if (!ok) throw new CodeError("Nessun codice attivo per questa azienda. Inserisci un codice.");
  return redeemCode(userId, email, ok.code);
}

export async function creditBalance(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${creditLedger.delta}),0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return r?.n ?? 0;
}

export async function createFamilyInvite(employeeId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, employeeId)).limit(1);
  if (!u?.companyId || u.coverageKind !== "employee") throw new CodeError("Solo i dipendenti possono invitare familiari.");
  const [co] = await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1);
  const existing = await db.select().from(familyInvites).where(eq(familyInvites.employeeId, employeeId));
  if (existing.length >= co.familyMax) throw new CodeError(`Puoi invitare al massimo ${co.familyMax} familiari.`);
  const code = "FAM-" + readableCode(6);
  await db.insert(familyInvites).values({ code, employeeId, companyId: co.id });
  return code;
}
