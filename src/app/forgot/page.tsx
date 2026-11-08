import { forgotAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field, Sp } from "@/components/ui";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Card className="space-y-4">
          <h1>Recupera la password</h1>
          <Sp sp={sp} />
          <form action={forgotAction} className="space-y-4">
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
            <Button className="w-full">Invia il link</Button>
          </form>
        </Card>
      </div>
    </PublicShell>
  );
}
