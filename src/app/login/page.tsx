import Link from "next/link";
import { loginAction, resendVerificationAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp, str } from "@/components/ui";

export const metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const unverified = str(sp.unverified);
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Accedi</h1>
          <Sp sp={sp} />
          <form action={loginAction} className="space-y-4">
            <Field label="Email">
              <input name="email" type="email" required autoComplete="email" defaultValue={unverified} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" required autoComplete="current-password" />
            </Field>
            <Button className="w-full">Accedi</Button>
          </form>
          {unverified && (
            <form action={resendVerificationAction}>
              <input type="hidden" name="email" value={unverified} />
              <button className="text-sm text-brand-700 underline">Invia di nuovo il link di conferma</button>
            </form>
          )}
          <div className="flex justify-between text-sm">
            <Link href="/forgot">Password dimenticata?</Link>
            <Link href="/register">Crea un account</Link>
          </div>
        </Card>
      </div>
    </PublicShell>
  );
}
