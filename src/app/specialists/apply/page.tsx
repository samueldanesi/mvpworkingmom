import { applyAction } from "@/app/actions/specialist";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp } from "@/components/ui";
import { LANGUAGES, SPECIALTIES } from "@/lib/constants";

export const metadata = { title: "Candidatura specialisti" };

/** S-01: candidatura con titoli, iscrizione all'albo, polizza RC, documenti e curriculum. */
export default async function Apply({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl">
        <Card className="space-y-4">
          <h1>Candidati come specialista</h1>
          <p className="text-sm text-ink-600">Selezioniamo con attenzione: servono almeno tre anni di esperienza clinica, iscrizione all&apos;albo o all&apos;associazione professionale e polizza RC. La valutazione è manuale.</p>
          <Sp sp={sp} />
          <form action={applyAction} className="space-y-4" encType="multipart/form-data">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome e cognome"><input name="fullName" required /></Field>
              <Field label="Telefono"><input name="phone" /></Field>
              <Field label="Email"><input name="email" type="email" required /></Field>
              <Field label="Password" hint="Almeno 10 caratteri, con lettere e numeri."><input name="password" type="password" required minLength={10} /></Field>
            </div>
            <Field label="Titolo professionale"><input name="title" placeholder="Es. Psicologa e psicoterapeuta" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Albo / associazione"><input name="registryName" placeholder="Es. Ordine Psicologi Lazio" required /></Field>
              <Field label="Numero di iscrizione"><input name="registryNumber" required /></Field>
            </div>
            <Field label="Numero polizza RC professionale"><input name="rcPolicyNumber" required /></Field>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Aree di specializzazione</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(SPECIALTIES).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="specializations" value={k} />{v}</label>)}</div>
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Lingue</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(LANGUAGES).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="languages" value={k} defaultChecked={k === "it"} />{v}</label>)}</div>
            </fieldset>
            <Field label="Curriculum / esperienza"><textarea name="cv" rows={5} required /></Field>
            <Field label="Documenti (titolo di studio, albo, polizza RC, CV)" hint="PDF o immagini, max 5 MB ciascuno."><input type="file" name="documents" multiple required accept=".pdf,.png,.jpg,.jpeg,.webp" /></Field>
            <Button>Invia candidatura</Button>
          </form>
        </Card>
      </div>
    </PublicShell>
  );
}
