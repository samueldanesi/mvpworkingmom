import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { Card, Notice, str } from "@/components/ui";
import { env } from "@/lib/env";

export default async function SentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md space-y-4">
        <Card className="space-y-3">
          <h1>Controlla la tua email</h1>
          <p className="text-sm text-ink-600">
            Se <strong>{str(sp.email)}</strong> è un indirizzo valido, ti abbiamo inviato un link per confermarlo. Dopo la conferma potrai accedere.
          </p>
        </Card>
        {!env.isProd && (
          <Notice tone="blue">
            Ambiente di sviluppo: le email non vengono inviate davvero. Aprile qui: <Link href="/dev/mailbox">posta simulata</Link>.
          </Notice>
        )}
      </div>
    </PublicShell>
  );
}
