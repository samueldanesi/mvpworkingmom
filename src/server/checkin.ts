import { and, count, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { appointments, db, events, pseudonymMap, responses } from "@/db";
import { pseudonymFor, recordResponse, track } from "@/lib/analytics";
import { CHECKIN_SET, QUESTIONNAIRES, T1_AFTER_SESSIONS, scoreQuestionnaire } from "@/lib/questionnaires";
import { SURVEY_A, SURVEY_C } from "@/lib/survey-library";

export type Moment = "T0" | "T1" | "T2";

/** U-15 / D-03: T0 all'ingresso, T1 dopo la quarta seduta, T2 a fine percorso o dopo 90 giorni. */
export async function dueCheckins(userId: string): Promise<Moment[]> {
  const [map] = await db.select().from(pseudonymMap).where(eq(pseudonymMap.userId, userId)).limit(1);
  const done = new Set<string>();
  let t0At: Date | null = null;
  if (map) {
    const rows = await db.select().from(responses).where(and(eq(responses.pseudonym, map.pseudonym), eq(responses.instrument, "who5")));
    for (const r of rows) {
      done.add(r.moment);
      if (r.moment === "T0") t0At = r.answeredAt;
    }
    const skipped = await db.select().from(events).where(and(eq(events.pseudonym, map.pseudonym), eq(events.type, "checkin_T0_skipped"))).limit(1);
    if (skipped.length) done.add("T0");
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.kind, "session"), eq(appointments.status, "completed")));
  const due: Moment[] = [];
  if (!done.has("T0")) due.push("T0");
  if (n >= T1_AFTER_SESSIONS && !done.has("T1")) due.push("T1");
  const old = t0At && DateTime.fromJSDate(t0At).plus({ days: 90 }) < DateTime.now();
  if (n > 0 && old && !done.has("T2")) due.push("T2");
  return due;
}

/** Survey A (T0) e C (T2) della Committente: solo per chi usa un codice aziendale. */
export async function submitCheckin(userId: string, moment: Moment, answers: Record<string, Record<string, number>>, kpi?: Record<string, number> | null) {
  for (const key of CHECKIN_SET[moment]) {
    const q = QUESTIONNAIRES[key];
    const a = answers[key] ?? {};
    const score = scoreQuestionnaire(q, a);
    if (score === null) throw new Error(`Rispondi a tutte le domande (${q.title}).`);
    await recordResponse(userId, { instrument: q.key, version: q.version, moment, score, items: a });
  }
  const sv = moment === "T0" ? SURVEY_A : moment === "T2" ? SURVEY_C : null;
  if (sv && kpi) await recordResponse(userId, { instrument: sv.key, version: sv.version, moment, score: null, items: kpi });
  await track(userId, `checkin_${moment}`);
}

export async function skipT0(userId: string) {
  await pseudonymFor(userId);
  await track(userId, "checkin_T0_skipped");
}
