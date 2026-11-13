import type { Survey } from "@/lib/survey-library";

/** Campi di una survey della libreria (D-02). I nomi sono `<prefix>.<ID>`. */
export function SurveyFields({ sv, prefix = sv.key }: { sv: Survey; prefix?: string }) {
  return (
    <div className="space-y-5">
      {sv.questions.map((q) => (
        <fieldset key={q.id} className="space-y-1.5">
          <legend className="text-sm font-medium text-ink-800">{q.text}</legend>
          {q.kind === "scale" ? (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-sm font-normal"><input type="radio" name={`${prefix}.${q.id}`} value={v} required />{v}</label>
                ))}
                {q.skip && <label className="flex items-center gap-1.5 text-sm font-normal text-ink-500"><input type="radio" name={`${prefix}.${q.id}`} value={0} />Preferisco non rispondere</label>}
              </div>
              <p className="text-xs text-ink-400">1 = {q.lo ?? "per niente"} · 5 = {q.hi ?? "moltissimo"}</p>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              {q.options!.map((o, i) => (
                <label key={o} className="flex items-center gap-2 text-sm font-normal">
                  <input type={q.kind === "multi" ? "checkbox" : "radio"} name={`${prefix}.${q.id}`} value={i + 1} required={q.kind === "single" && !q.skip} />
                  {o}
                </label>
              ))}
              {q.skip && q.kind === "single" && <label className="flex items-center gap-2 text-sm font-normal text-ink-500"><input type="radio" name={`${prefix}.${q.id}`} value={0} />Preferisco non rispondere</label>}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
