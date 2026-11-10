import { goToJoinAction } from "@/app/actions/extra";
import { PublicShell } from "@/components/Shell";
import { Button, Card, Field } from "@/components/ui";

export const metadata = { title: "Ho un codice aziendale" };

export default function JoinIndex() {
  return (
    <PublicShell>
      <Card className="mx-auto max-w-md space-y-4">
        <h1>Hai un codice aziendale?</h1>
        <p className="text-sm text-ink-600">Inseriscilo per scoprire cosa copre il benefit della tua azienda.</p>
        <form action={goToJoinAction} className="space-y-3">
          <Field label="Codice"><input name="code" required placeholder="ES. ACME2026" /></Field>
          <Button>Continua</Button>
        </form>
      </Card>
    </PublicShell>
  );
}
