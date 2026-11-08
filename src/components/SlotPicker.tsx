import type { AppointmentSlot } from "@/lib/slots";
import { groupByDay } from "@/lib/slots";
import { fmtTime } from "@/lib/format";
import { Empty } from "@/components/ui";

/** U-08 / S-04: calendario con slot reali, mostrati nel fuso dell'utente. */
export function SlotPicker({ slots, tz, name = "start" }: { slots: AppointmentSlot[]; tz: string; name?: string }) {
  if (slots.length === 0) return <Empty>Nessuno slot disponibile nelle prossime settimane.</Empty>;
  const days = groupByDay(slots, tz);
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500">Orari nel tuo fuso: {tz}</p>
      {days.map((d) => (
        <fieldset key={d.day}>
          <legend className="mb-1.5 text-sm font-medium capitalize">{d.label}</legend>
          <div className="flex flex-wrap gap-2">
            {d.slots.map((s) => (
              <label key={s.startsAt.toISOString()} className="cursor-pointer">
                <input type="radio" name={name} value={s.startsAt.toISOString()} required className="peer sr-only" />
                <span className="inline-block rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300">
                  {fmtTime(s.startsAt, tz)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
