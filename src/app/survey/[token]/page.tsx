import { notFound } from "next/navigation";
import { submitSurveyAction } from "@/app/actions/extra";
import { Button, Card, Logo, Notice, Sp, str } from "@/components/ui";
import { getSurveyByToken, SURVEY_ITEMS } from "@/server/surveys";

export const metadata = { title: "Indagine anonima" };

/** B-10: pagina pubblica, senza login. Nessun dato personale raccolto. */
export default async function Survey({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const s = await getSurveyByToken(token);
  if (!s) notFound();
  const done = !!str(sp.ok);
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <Logo />
      <Sp sp={sp} />
      <Card className="space-y-4">
        <h1>{s.s.title}</h1>
        <p className="text-sm text-ink-600">Indagine promossa da {s.company}. È <strong>anonima</strong>: non chiediamo nome né email e l&apos;azienda vede solo risultati aggregati.</p>
        {s.s.status !== "open" ? (
          <Notice tone="blue">Questa indagine è chiusa.</Notice>
        ) : done ? null : (
          <form action={submitSurveyAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            {SURVEY_ITEMS.map((it) => (
              <fieldset key={it.key} className="space-y-1">
                <legend className="text-sm font-medium">{it.label}</legend>
                <div className="flex gap-3 text-sm">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label key={v} className="flex items-center gap-1"><input type="radio" name={it.key} value={v} required /> {v}</label>
                  ))}
                </div>
                <p className="text-xs text-ink-400">1 = per niente d&apos;accordo · 5 = del tutto d&apos;accordo</p>
              </fieldset>
            ))}
            <Button>Invia in modo anonimo</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
