import { saveIntakeAction } from "@/app/actions/onboarding";
import { Button, Card, Field, Sp, str } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { INTAKE_PATHS, INTAKE_STAGES, LANGUAGES, SITUATIONS, SITUATION_GROUPS } from "@/lib/constants";
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
            <h1>Quale percorso ti interessa?</h1>
            <p className="text-sm text-ink-600">Ogni percorso si adatta a te.</p>
            <div className="space-y-2">
              {Object.entries(INTAKE_PATHS).map(([k, v]) => (
                <label key={k} className="flex items-start gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
                  <input type="radio" name="path" value={k} defaultChecked={d.path === k} required className="mt-1" />
                  <span><strong>{v.title}.</strong> {v.text}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>In che momento sei?</h1>
            <p className="text-sm text-ink-600">Ti faremo alcune domande su ciò che stai vivendo. Ci aiuteranno a orientarti verso lo specialista più adatto a te.</p>
            <div className="space-y-2">
              {Object.entries(INTAKE_STAGES).map(([k, v]) => (
                <label key={k} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
                  <input type="radio" name="stage" value={k} defaultChecked={d.stage === k} required />
                  {v.label}
                </label>
              ))}
            </div>
            <Field label="Quanti figli hai? (se stai aspettando il primo, lascia 1)" hint="Indichiamo solo la fascia d'età, mai nomi o dati dei bambini.">
              <select name="childrenCount" defaultValue={String(Math.max(1, d.childrenCount ?? 1))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n === 5 ? "5 o più" : n}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Ti riconosci in qualcuna di queste situazioni?</h1>
            <p className="text-sm text-ink-600">Puoi sceglierne più di una.</p>
            {SITUATION_GROUPS.map((g) => (
              <fieldset key={g} className="space-y-2">
                <legend className="text-sm font-semibold text-ink-900">{g}</legend>
                {SITUATIONS.filter((x) => x.group === g).map((x) => (
                  <label key={x.id} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
                    <input type="checkbox" name="situations" value={x.id} defaultChecked={checked(d.situations, x.id)} />
                    {d.path === "bambino" && x.third ? x.third : x.text}
                  </label>
                ))}
              </fieldset>
            ))}
            <label className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
              <input type="checkbox" name="situations" value="non_so" defaultChecked={!!d.situations && d.situations.length === 0 && step < intake.step} />
              Non so ancora: vorrei solo capire da dove cominciare
            </label>
            <Field label="Cosa ti ha spinto a cercare supporto proprio ora? (facoltativo)" hint="Puoi saltare questa domanda. Non scrivere qui situazioni di emergenza: per quelle chiama il 112.">
              <textarea name="notes" rows={3} maxLength={600} defaultValue={d.notes} />
            </Field>
          </>
        )}
        {step === 3 && (
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
        {step === 4 && (
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
        {step === 5 && (
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
