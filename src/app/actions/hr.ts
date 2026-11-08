"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { accessCodes, companies, db } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { readableCode } from "@/lib/crypto";
import { done, fail, field, num } from "@/lib/flash";
import { issueReport } from "@/server/kpi";

async function hr() {
  const u = await requireUser({ roles: ["hr"] });
  if (!u.companyId) redirect("/hr?error=" + encodeURIComponent("Utente HR non collegato a un'azienda."));
  return { u, companyId: u.companyId! };
}

/** B-03: codici di accesso (unico e/o monouso), scadenza e revoca. */
export async function createCodeAction(fd: FormData) {
  const { u, companyId } = await hr();
  const kind = field(fd, "kind") === "single" ? "single" : "shared";
  const custom = field(fd, "code").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const code = custom || readableCode(8);
  if (code.length < 6) fail("/hr/codes", "Il codice deve avere almeno 6 caratteri.");
  const expires = field(fd, "expiresAt");
  const count = kind === "single" ? Math.min(Math.max(num(fd, "howMany") ?? 1, 1), 200) : 1;
  try {
    for (let i = 0; i < count; i++) {
      await db.insert(accessCodes).values({
        companyId,
        code: kind === "single" && count > 1 ? readableCode(8) : code,
        kind,
        maxUses: kind === "single" ? 1 : num(fd, "maxUses") ?? null,
        expiresAt: expires ? new Date(expires + "T23:59:59") : null,
      });
    }
  } catch {
    fail("/hr/codes", "Questo codice esiste già: scegline un altro.");
  }
  await audit(u, "code_created", "company", companyId);
  done("/hr/codes", count > 1 ? `${count} codici monouso creati.` : "Codice creato.");
}

export async function revokeCodeAction(fd: FormData) {
  const { u, companyId } = await hr();
  await db.update(accessCodes).set({ revokedAt: new Date() }).where(and(eq(accessCodes.id, field(fd, "id")), eq(accessCodes.companyId, companyId)));
  await audit(u, "code_revoked", "company", companyId);
  done("/hr/codes", "Codice revocato: chi lo usa da ora in poi riceverà un messaggio chiaro e nessun accesso al benefit.");
}

export async function updateAccessRulesAction(fd: FormData) {
  const { u, companyId } = await hr();
  const domains = field(fd, "domains").split(/[\s,;]+/).map((d) => d.toLowerCase().replace(/^@/, "")).filter(Boolean);
  await db.update(companies).set({ allowedDomains: domains, allowPersonalEmail: fd.get("personal") === "on" }).where(eq(companies.id, companyId));
  await audit(u, "access_rules_updated", "company", companyId);
  done("/hr/codes", "Regole di accesso aggiornate.");
}

/** B-09: emissione di un report immutabile (D-07). */
export async function issueReportAction(fd: FormData) {
  const { u, companyId } = await hr();
  const from = new Date(field(fd, "from"));
  const to = new Date(field(fd, "to") + "T23:59:59");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) fail("/hr/reports", "Periodo non valido.");
  const r = await issueReport(companyId, { from, to }, u.id);
  await audit(u, "report_issued", "report", r.id);
  redirect(`/hr/reports/${r.id}?ok=${encodeURIComponent(`Report emesso (versione ${r.version}).`)}`);
}
