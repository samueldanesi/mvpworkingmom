"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, diaryEntries } from "@/db";
import { encryptText } from "@/lib/crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { connectCalendar, disconnectCalendar } from "@/lib/integrations";
import { done, fail, field, num } from "@/lib/flash";
import { rateAppointment } from "@/server/ratings";
import { getSurveyByToken, SURVEY_ITEMS, submitSurvey } from "@/server/surveys";

/** B-10: risposta anonima all'indagine aziendale (nessun login; un cookie evita doppie compilazioni dallo stesso browser). */
export async function submitSurveyAction(fd: FormData) {
  const token = field(fd, "token");
  const s = await getSurveyByToken(token);
  if (!s || s.s.status !== "open") fail(`/survey/${token}`, "Indagine non disponibile.");
  const jar = await cookies();
  if (jar.get(`wm_sv_${s!.s.id}`)) redirect(`/survey/${token}?ok=${encodeURIComponent("Hai già risposto: grazie.")}`);
  const items: Record<string, number> = {};
  for (const it of SURVEY_ITEMS) items[it.key] = num(fd, it.key) ?? 0;
  try {
    await submitSurvey(s!.s.id, items);
  } catch (e) {
    fail(`/survey/${token}`, (e as Error).message);
  }
  jar.set(`wm_sv_${s!.s.id}`, "1", { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax", path: "/" });
  redirect(`/survey/${token}?ok=${encodeURIComponent("Grazie! Le risposte sono anonime.")}`);
}

/** S-12: valutazione di un appuntamento svolto. */
export async function rateAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const id = field(fd, "id");
  try {
    await rateAppointment(u.id, id, num(fd, "score") ?? 0);
  } catch (e) {
    fail(`/app/appointments/${id}`, (e as Error).message);
  }
  done(`/app/appointments/${id}`, "Grazie per la valutazione.");
}

/** S-04 / T-06: collegamento calendario (simulato). */
export async function calendarAction(fd: FormData) {
  const u = await requireUser({ roles: ["specialist"] });
  const provider = field(fd, "provider") === "outlook" ? "outlook" : "google";
  if (field(fd, "op") === "disconnect") await disconnectCalendar(u.id, provider);
  else await connectCalendar(u.id, provider);
  done("/specialist/agenda", field(fd, "op") === "disconnect" ? "Calendario scollegato." : "Calendario collegato (simulato).");
}

export async function goToJoinAction(fd: FormData) {
  const code = field(fd, "code").toUpperCase().replace(/[^A-Z0-9]/g, "");
  redirect(code ? `/join/${code}` : "/join");
}

/** U-16: diario. */
export async function addDiaryAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const text = field(fd, "content");
  const mood = num(fd, "mood") ?? 3;
  if (!text) fail("/app/diary", "Scrivi qualcosa nella nota.");
  await db.insert(diaryEntries).values({ userId: u.id, mood: Math.min(5, Math.max(1, Math.round(mood))), contentEnc: encryptText(text) });
  done("/app/diary", "Nota salvata.");
}
export async function deleteDiaryAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  await db.delete(diaryEntries).where(and(eq(diaryEntries.id, field(fd, "id")), eq(diaryEntries.userId, u.id)));
  done("/app/diary", "Nota eliminata.");
}
