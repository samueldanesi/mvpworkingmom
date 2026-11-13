import { closeSurveyAction, createSurveyAction } from "@/app/actions/hr";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { env } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import { requireHr } from "@/lib/hr";
import { surveyResults } from "@/server/surveys";

export const metadata = { title: "Indagine aziendale" };

/** B-10: indagine anonima a tutti i dipendenti (anche chi non usa il servizio). Solo risultati aggregati sopra soglia. */
export default async function Surveys({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const list = await surveyResults(co.id);
  return (
    <>
      <PageHeader title="Indagine aziendale anonima" subtitle="Un questionario breve per tutti i dipendenti, tramite link. Alimenta l'indicatore K-14 e il confronto tra due rilevazioni." />
      <Sp sp={sp} />
      <Card className="mb-6">
        <form action={createSurveyAction} className="flex flex-wrap items-end gap-3">
          <Field label="Titolo"><input name="title" defaultValue="Indagine su genitorialità e cura" /></Field>
          <Button>Lancia una nuova rilevazione</Button>
        </form>
      </Card>
      {list.length === 0 ? <Empty>Nessuna indagine ancora lanciata.</Empty> : (
        <div className="space-y-4">
          {list.map((s) => (
            <Card key={s.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2>Rilevazione {s.round} · {s.title}</h2>
                <Badge tone={s.status === "open" ? "green" : "gray"}>{s.status === "open" ? "Aperta" : "Chiusa"}</Badge>
              </div>
              <p className="text-xs text-ink-500">Lanciata il {fmtDate(s.createdAt)} · Link da condividere: <code>{env.appUrl}/survey/{s.token}</code></p>
              {s.suppressed ? <Notice tone="amber">{s.n} risposte: sotto la soglia di anonimato nessun risultato viene mostrato.</Notice> : (
                <div className="space-y-3 text-sm">
                  {s.questions.map((q) => (
                    <div key={q.id}>
                      <p className="font-medium text-ink-800">{q.id} · {q.text}</p>
                      {q.kind === "scale" ? (
                        <p className="text-ink-600">{q.n ? `Media ${q.mean} su 5 · ${q.top}% risposte 4-5` : "Nessuna risposta valida"} (n={q.n})</p>
                      ) : (
                        <p className="text-ink-600">{q.n ? q.shares!.filter((x) => x.pct > 0).map((x) => `${x.label} ${x.pct}%`).join(" · ") : "Nessuna risposta"} (n={q.n})</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {s.status === "open" && <form action={closeSurveyAction}><input type="hidden" name="id" value={s.id} /><button className="text-xs underline">Chiudi l&apos;indagine</button></form>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
