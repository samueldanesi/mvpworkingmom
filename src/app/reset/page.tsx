import { resetAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp, str } from "@/components/ui";

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Scegli una nuova password</h1>
          <Sp sp={sp} />
          <form action={resetAction} className="space-y-4">
            <input type="hidden" name="token" value={str(sp.token) ?? ""} />
            <Field label="Nuova password" hint="Almeno 10 caratteri, con lettere e numeri.">
              <input name="password" type="password" required minLength={10} autoComplete="new-password" />
            </Field>
            <Button className="w-full">Salva password</Button>
          </form>
        </Card>
      </div>
    </PublicShell>
  );
}
