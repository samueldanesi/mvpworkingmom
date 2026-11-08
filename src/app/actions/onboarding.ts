"use server";

import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { consents, db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { DOC_VERSIONS } from "@/lib/constants";
import { fail, field, fields, num } from "@/lib/flash";
import { CHECKIN_SET } from "@/lib/questionnaires";
import { CodeError, redeemByDomain, redeemCode } from "@/server/codes";
import { submitCheckin, skipT0, type Moment } from "@/server/checkin";
import { saveIntakeStep, type IntakeData } from "@/server/intake";
import { ensureSubject } from "@/lib/analytics";

export async function choosePathAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const path = field(fd, "path") === "code" ? "code" : "private";
  await db.update(users).set({ onboardingPath: path }).where(eq(users.id, u.id));
  redirect(path === "code" ? "/onboarding?code=1" : "/onboarding/consents");
}

export async function redeemCodeAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  try {
    await redeemCode(u.id, u.email, field(fd, "code"));
  } catch (e) {
    if (e instanceof CodeError) fail("/onboarding?code=1", e.message);
    throw e;
  }
  await db.update(users).set({ onboardingPath: "code" }).where(eq(users.id, u.id));
  redirect("/onboarding?covered=1");
}

export async function redeemDomainAction() {
  const u = await requireUser({ roles: ["user"] });
  try {
    await redeemByDomain(u.id, u.email);
  } catch (e) {
    if (e instanceof CodeError) fail("/onboarding?code=1", e.message);
    throw e;
  }
  await db.update(users).set({ onboardingPath: "code" }).where(eq(users.id, u.id));
  redirect("/onboarding?covered=1");
}

/** U-03: consenso esplicito sui dati sanitari, separato dal consenso all'uso aggregato nei report. */
export async function grantConsentsAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  if (fd.get("health") !== "on") fail("/onboarding/consents", "Senza il consenso al trattamento dei dati sulla salute non possiamo proseguire.");
  const have = await db.select().from(consents).where(and(eq(consents.userId, u.id), sql`${consents.revokedAt} is null`));
  const add = (kind: keyof typeof DOC_VERSIONS) => {
    if (!have.some((c) => c.kind === kind)) return [{ userId: u.id, kind, version: DOC_VERSIONS[kind] }];
    return [];
  };
  const rows = [...add("health_data"), ...(fd.get("aggregate") === "on" ? add("aggregate_use") : [])];
  if (rows.length) await db.insert(consents).values(rows);
  redirect("/onboarding/questionnaire");
}

export async function saveIntakeAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const step = num(fd, "step") ?? 0;
  const patch: Partial<IntakeData> = {};
  if (step === 0) {
    patch.area = field(fd, "area");
    patch.notes = field(fd, "notes").slice(0, 600);
    if (!patch.area) fail(`/onboarding/questionnaire?step=0`, "Scegli un'area.");
  } else if (step === 1) {
    patch.childrenCount = num(fd, "childrenCount") ?? 0;
    patch.childAgeGroups = fields(fd, "ageGroups");
  } else if (step === 2) {
    patch.language = field(fd, "language") || "it";
    patch.gender = (["f", "m"].includes(field(fd, "gender")) ? field(fd, "gender") : "any") as "any" | "f" | "m";
    patch.times = fields(fd, "times");
  } else if (step === 3) {
    patch.previousTherapy = field(fd, "previousTherapy") === "yes" ? "yes" : "no";
  } else if (step === 4) {
    const r1 = field(fd, "risk1");
    const r2 = field(fd, "risk2");
    if (!r1 || !r2) fail(`/onboarding/questionnaire?step=4`, "Rispondi a entrambe le domande.");
    patch.risk1 = r1 === "yes" ? "yes" : "no";
    patch.risk2 = r2 === "yes" ? "yes" : "no";
  }
  const res = await saveIntakeStep(u.id, step, patch);
  if (res.safety) redirect("/emergency");
  if (res.completed) redirect("/onboarding/checkin");
  redirect(`/onboarding/questionnaire?step=${step + 1}`);
}

function parseAnswers(fd: FormData, moment: Moment) {
  const out: Record<string, Record<string, number>> = {};
  for (const key of CHECKIN_SET[moment]) {
    out[key] = {};
    for (const [k, v] of fd.entries()) {
      if (typeof k === "string" && k.startsWith(key + ".")) out[key][k.slice(key.length + 1)] = Number(v);
    }
  }
  return out;
}

export async function submitCheckinAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const moment = field(fd, "moment") as Moment;
  const next = field(fd, "next") || "/app";
  if (!(moment in CHECKIN_SET)) fail(next, "Check-in non valido.");
  try {
    await submitCheckin(u.id, moment, parseAnswers(fd, moment));
  } catch (e) {
    fail(`${next.split("?")[0]}?moment=${moment}`, e instanceof Error ? e.message : "Errore");
  }
  redirect(next === "/onboarding/checkin" ? "/app/matching" : "/app/checkin?ok=" + encodeURIComponent("Grazie, risposte salvate."));
}

export async function skipCheckinAction() {
  const u = await requireUser({ roles: ["user"] });
  await skipT0(u.id);
  await ensureSubject(u.id);
  redirect("/app/matching");
}
