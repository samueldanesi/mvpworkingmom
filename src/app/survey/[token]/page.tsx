import { notFound } from "next/navigation";
import { submitSurveyAction } from "@/app/actions/extra";
import { Button, Card, Logo, Notice, Sp, str } from "@/components/ui";
import { SurveyFields } from "@/components/SurveyFields";
import { SURVEY_E } from "@/lib/survey-library";
import { getSurveyByToken } from "@/server/surveys";

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
        <p className="text-sm text-ink-600">Indagine promossa da {s.company}. È <strong>anonima</strong> (circa 8 minuti): non chiediamo nome né email e l&apos;azienda vede solo risultati aggregati.</p>
        {s.s.status !== "open" ? (
          <Notice tone="blue">Questa indagine è chiusa.</Notice>
        ) : done ? null : (
          <form action={submitSurveyAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <SurveyFields sv={SURVEY_E} />
            <Button>Invia in modo anonimo</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
