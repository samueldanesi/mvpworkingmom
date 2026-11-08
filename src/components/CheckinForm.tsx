import { submitCheckinAction } from "@/app/actions/onboarding";
import { Button, Card, Notice } from "@/components/ui";
import { env } from "@/lib/env";
import { CHECKIN_SET, QUESTIONNAIRES } from "@/lib/questionnaires";

/** U-15: check-in di benessere (T0/T1/T2). Le domande vengono dalla libreria versionata. */
export function CheckinForm({ moment, next }: { moment: "T0" | "T1" | "T2"; next: string }) {
  return (
    <form action={submitCheckinAction} className="space-y-5">
      <input type="hidden" name="moment" value={moment} />
      <input type="hidden" name="next" value={next} />
      {CHECKIN_SET[moment].map((key) => {
        const q = QUESTIONNAIRES[key];
        const opts = Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale.min + i);
        return (
          <Card key={key} className="space-y-3">
            <div>
              <h2>{q.title}</h2>
              <p className="text-sm text-ink-500">{q.intro.replace(/^BOZZA da validare\.\s*/, "")}</p>
              {q.draft && (!env.isProd || env.demoMode) && <p className="mt-1 text-xs text-amber-700">Domande provvisorie: da sostituire con lo strumento validato (D-04).</p>}
            </div>
            {q.items.map((it) => (
              <fieldset key={it.id} className="space-y-1.5">
                <legend className="text-sm font-medium text-ink-800">{it.text}</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {opts.map((o) => (
                    <label key={o} className="flex items-center gap-1.5 text-sm font-normal">
                      <input type="radio" name={`${key}.${it.id}`} value={o} required />
                      {q.scale.labels[o - q.scale.min]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </Card>
        );
      })}
      <Notice tone="blue">Le tue risposte individuali non vengono mai mostrate alla tua azienda: contano solo come dati aggregati e anonimi, se hai dato il consenso.</Notice>
      <Button>Invia</Button>
    </form>
  );
}
