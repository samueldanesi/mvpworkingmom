import { verifyEmailAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Sp, str } from "@/components/ui";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = str(sp.token);
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Conferma la tua email</h1>
          <Sp sp={sp} />
          {token ? (
            <form action={verifyEmailAction}>
              <input type="hidden" name="token" value={token} />
              <Button className="w-full">Conferma indirizzo email</Button>
            </form>
          ) : (
            <p className="text-sm text-ink-600">Apri il link che ti abbiamo inviato per email.</p>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
