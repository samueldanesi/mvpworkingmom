import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { Card, LinkButton, Notice } from "@/components/ui";
import { CodeError, peekCode } from "@/server/codes";

export const metadata = { title: "Il tuo codice aziendale" };
export const dynamic = "force-dynamic";

/** U-02: anteprima del codice prima della registrazione. */
export default async function VerifyCode({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  let res: Awaited<ReturnType<typeof peekCode>> | null = null;
  let err = "";
  try {
    res = await peekCode(clean);
  } catch (e) {
    err = e instanceof CodeError ? e.message : "Non riusciamo a controllare il codice in questo momento. Riprova tra poco.";
  }
  const co = res?.company;
  return (
    <PublicShell>
      <Card className="mx-auto max-w-md space-y-4">
        {co ? (
          <>
            <h1>Il codice è valido</h1>
            <p className="text-sm text-ink-700">
              Ti dà accesso al programma di <strong>{co.name}</strong>
              {res?.family ? " come familiare." : "."}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              <li>{co.includedSessions} sedute incluse</li>
              {co.discountPct > 0 && <li>{co.discountPct}% di sconto sulle sedute successive</li>}
              <li>Il primo colloquio di 20 minuti è gratuito</li>
            </ul>
            {!res?.family && co.allowedDomains.length > 0 && !co.allowPersonalEmail && (
              <Notice tone="blue">Per attivarlo registrati con la tua email aziendale ({co.allowedDomains.map((d) => "@" + d).join(", ")}).</Notice>
            )}
            <LinkButton href={`/join/${clean}`} className="w-full">Registrati e attiva il codice</LinkButton>
          </>
        ) : (
          <>
            <h1>Codice non utilizzabile</h1>
            <Notice tone="amber">{err}</Notice>
            <LinkButton href="/join" variant="secondary" className="w-full">Riprova con un altro codice</LinkButton>
          </>
        )}
        <p className="text-center text-sm text-ink-500">Senza codice? <Link href="/register">Registrati comunque</Link></p>
      </Card>
    </PublicShell>
  );
}
