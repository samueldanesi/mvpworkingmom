import { login2faAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp } from "@/components/ui";

export default async function TwoFaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Verifica a due fattori</h1>
          <p className="text-sm text-ink-600">Inserisci il codice a 6 cifre della tua app di autenticazione.</p>
          <Sp sp={sp} />
          <form action={login2faAction} className="space-y-4">
            <Field label="Codice">
              <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus />
            </Field>
            <Button className="w-full">Conferma</Button>
          </form>
        </Card>
      </div>
    </PublicShell>
  );
}
