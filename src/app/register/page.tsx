import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp } from "@/components/ui";

export const metadata = { title: "Registrati" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Crea il tuo account</h1>
          <Sp sp={sp} />
          <form action={registerAction} className="space-y-4">
            <Field label="Nome e cognome">
              <input name="fullName" required autoComplete="name" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Password" hint="Almeno 10 caratteri, con lettere e numeri.">
              <input name="password" type="password" required minLength={10} autoComplete="new-password" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Genere (facoltativo)" hint="Solo per statistiche aggregate.">
                <select name="gender" defaultValue="">
                  <option value="">Preferisco non dirlo</option>
                  <option value="f">Donna</option>
                  <option value="m">Uomo</option>
                  <option value="x">Altro</option>
                </select>
              </Field>
              <Field label="Anno di nascita (facoltativo)">
                <input name="birthYear" type="number" min={1940} max={2010} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm font-normal">
              <input type="checkbox" name="terms" required className="mt-1" />
              <span>
                Ho letto e accetto i <Link href="/terms">Termini di servizio</Link> e l&apos;<Link href="/privacy">Informativa privacy</Link>.
              </span>
            </label>
            <Button className="w-full">Registrati</Button>
          </form>
          <p className="text-sm text-ink-500">
            Hai già un account? <Link href="/login">Accedi</Link>
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
