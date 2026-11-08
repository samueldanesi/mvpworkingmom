import { saveIntakeAction } from "@/app/actions/onboarding";
import { Button, Card, Field, Sp, str } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { AGE_GROUPS, LANGUAGES, NEED_AREAS } from "@/lib/constants";
import { getIntake, INTAKE_STEPS } from "@/server/intake";
import { redirect } from "next/navigation";

export const metadata = { title: "Questionario" };

export default async function Questionnaire({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const intake = await getIntake(u.id);
  if (intake.safetyFlag) redirect("/emergency");
  const step = Math.min(Number(str(sp.step) ?? intake.step) || 0, INTAKE_STEPS - 1);
  const d = intake.data;
  const checked = (arr: string[] | undefined, v: string) => !!arr?.includes(v);
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs text-ink-500">
          Passo {step + 1} di {INTAKE_STEPS} · puoi interrompere e riprendere quando vuoi
        </p>
        <div className="mt-1 h-1.5 rounded-full bg-ink-100">
          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${((step + 1) / INTAKE_STEPS) * 100}%` }} />
        </div>
      </div>
      <Sp sp={sp} />
      <form action={saveIntakeAction} className="space-y-5">
        <input type="hidden" name="step" value={step} />
        {step === 0 && (
          <>
            <h1>Di cosa hai bisogno?</h1>
            <div className="space-y-2">
              {Object.entries(NEED_AREAS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
                  <input type="radio" name="area" value={k} defaultChecked={d.area === k} required />
                  {v}
                </label>
              ))}
            </div>
            <Field label="Vuoi aggiungere qualcosa? (facoltativo)" hint="Non scrivere qui situazioni di emergenza: per quelle chiama il 112.">
              <textarea name="notes" rows={3} maxLength={600} defaultValue={d.notes} />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <h1>La tua famiglia</h1>
            <Field label="Quanti figli hai?">
              <select name="childrenCount" defaultValue={String(d.childrenCount ?? 1)}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n === 5 ? "5 o più" : n}</option>
                ))}
              </select>
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Fasce d&apos;età dei figli</legend>
              {Object.entries(AGE_GROUPS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm font-normal">
                  <input type="checkbox" name="ageGroups" value={k} defaultChecked={checked(d.childAgeGroups, k)} />
                  {v}
                </label>
              ))}
              <p className="text-xs text-ink-500">Indichiamo solo la fascia d&apos;età, mai nomi o dati dei bambini.</p>
            </fieldset>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Le tue preferenze</h1>
            <Field label="Lingua">
              <select name="language" defaultValue={d.language ?? "it"}>
                {Object.entries(LANGUAGES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Genere dello specialista">
              <select name="gender" defaultValue={d.gender ?? "any"}>
                <option value="any">Indifferente</option>
                <option value="f">Donna</option>
                <option value="m">Uomo</option>
              </select>
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Quando sei più libera/o?</legend>
              {[["mattina", "Mattina"], ["pranzo", "Pausa pranzo"], ["sera", "Sera"], ["weekend", "Weekend"]].map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm font-normal">
                  <input type="checkbox" name="times" value={k} defaultChecked={checked(d.times, k)} />
                  {v}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Esperienze precedenti</h1>
            <p className="text-sm text-ink-600">Hai già fatto un percorso con uno psicologo o un altro specialista?</p>
            {[["no", "No, è la prima volta"], ["yes", "Sì, ho già fatto un percorso"]].map(([k, v]) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
                <input type="radio" name="previousTherapy" value={k} defaultChecked={(d.previousTherapy ?? "no") === k} />
                {v}
              </label>
            ))}
          </>
        )}
        {step === 4 && (
          <>
            <h1>Un ultimo controllo</h1>
            <p className="text-sm text-ink-600">Due domande importanti per la tua sicurezza. Rispondi con sincerità: nessuna risposta ti penalizza.</p>
            {[
              ["risk1", "Negli ultimi giorni hai avuto pensieri di farti del male o di non voler più vivere?"],
              ["risk2", "Ti senti in pericolo o hai bisogno di aiuto immediato, per te o per altri (compresi i tuoi figli)?"],
            ].map(([k, q]) => (
              <fieldset key={k} className="space-y-2">
                <legend className="text-sm font-medium">{q}</legend>
                <div className="flex gap-4">
                  {[["no", "No"], ["yes", "Sì"]].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-sm font-normal">
                      <input type="radio" name={k} value={v} required />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </>
        )}
        <div className="flex items-center gap-3">
          {step > 0 && <a href={`/onboarding/questionnaire?step=${step - 1}`} className="text-sm">← Indietro</a>}
          <Button>{step === INTAKE_STEPS - 1 ? "Concludi" : "Avanti"}</Button>
        </div>
      </form>
    </Card>
  );
}
