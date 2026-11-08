import { DateTime } from "luxon";

export type Rule = { weekday: number; startMin: number; endMin: number; kind: "intro" | "session" };
export type Busy = { startsAt: Date; endsAt: Date };
export type AppointmentSlot = { startsAt: Date; endsAt: Date };

export type SlotOptions = {
  rules: Rule[];
  kind: "intro" | "session";
  durationMin: number;
  tz: string; // fuso del professionista
  from: Date;
  days: number;
  busy: Busy[];
  offDays?: string[]; // yyyy-MM-dd nel fuso del professionista
  leadHours?: number;
  now?: Date;
  weeklyCapacity?: number;
  /** appuntamenti attivi già presenti per settimana ISO (chiave "2026-W46") */
  weeklyBooked?: Record<string, number>;
  bufferMin?: number;
};

export const weekKey = (dt: DateTime) => `${dt.weekYear}-W${String(dt.weekNumber).padStart(2, "0")}`;

/**
 * S-04 / U-08: calcola gli slot reali prenotabili partendo dalle regole ricorrenti, togliendo
 * eccezioni (giorni liberi), appuntamenti già presi e il tempo minimo di preavviso.
 * Funzione pura: nessun accesso al database (testabile).
 */
export function generateSlots(o: SlotOptions): AppointmentSlot[] {
  const now = o.now ?? new Date();
  const lead = (o.leadHours ?? 6) * 3_600_000;
  const buffer = o.bufferMin ?? 10;
  const step = o.durationMin + buffer;
  const out: AppointmentSlot[] = [];
  const start = DateTime.fromJSDate(o.from).setZone(o.tz).startOf("day");
  const rules = o.rules.filter((r) => r.kind === o.kind);
  const off = new Set(o.offDays ?? []);
  const counted: Record<string, number> = { ...(o.weeklyBooked ?? {}) };

  for (let i = 0; i < o.days; i++) {
    const day = start.plus({ days: i });
    if (off.has(day.toFormat("yyyy-MM-dd"))) continue;
    for (const r of rules.filter((x) => x.weekday === day.weekday)) {
      for (let t = r.startMin; t + o.durationMin <= r.endMin; t += step) {
        const s = day.set({ hour: Math.floor(t / 60), minute: t % 60, second: 0, millisecond: 0 });
        const e = s.plus({ minutes: o.durationMin });
        const sd = s.toJSDate();
        const ed = e.toJSDate();
        if (sd.getTime() < now.getTime() + lead) continue;
        if (o.busy.some((b) => b.startsAt < ed && b.endsAt > sd)) continue;
        if (o.weeklyCapacity !== undefined) {
          const k = weekKey(s);
          if ((counted[k] ?? 0) >= o.weeklyCapacity) continue;
        }
        out.push({ startsAt: sd, endsAt: ed });
      }
    }
  }
  out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  // elimina duplicati (regole sovrapposte)
  return out.filter((s, i) => i === 0 || s.startsAt.getTime() !== out[i - 1].startsAt.getTime());
}

export function groupByDay(slots: AppointmentSlot[], tz: string): { day: string; label: string; slots: AppointmentSlot[] }[] {
  const map = new Map<string, AppointmentSlot[]>();
  for (const s of slots) {
    const k = DateTime.fromJSDate(s.startsAt).setZone(tz).toFormat("yyyy-MM-dd");
    (map.get(k) ?? map.set(k, []).get(k)!).push(s);
  }
  return [...map.entries()].map(([day, slots]) => ({
    day,
    label: DateTime.fromISO(day, { zone: tz }).setLocale("it").toFormat("cccc d LLLL"),
    slots,
  }));
}
