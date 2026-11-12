import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { PublicShell } from "@/components/Shell";
import { Card, Notice } from "@/components/ui";
import { db, emailOutbox } from "@/db";
import { env } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Posta simulata: solo in sviluppo. */
export default async function Mailbox({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const to = (Array.isArray(sp.to) ? sp.to[0] : sp.to)?.trim().toLowerCase();
  if (env.isProd && !env.demoMode) notFound();
  const q = db.select().from(emailOutbox);
  const rows = await (to ? q.where(eq(emailOutbox.toEmail, to)) : q).orderBy(desc(emailOutbox.createdAt)).limit(40);
  const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((p, i) => (/^https?:/.test(p) ? <a key={i} href={p}>{p}</a> : p));
  return (
    <PublicShell>
      <div className="space-y-4">
        <h1>Posta simulata</h1>
        <Notice tone="blue">Versione di prova: qui compaiono le email che il sito invierebbe. In produzione partiranno da un provider di posta.{to ? <> Stai vedendo solo quelle per <strong>{to}</strong>. <Link href="/dev/mailbox">Mostra tutte</Link>.</> : null}</Notice>
        {rows.length === 0 && <Notice>Nessuna email{to ? ` per ${to}` : ""} per ora. Se hai appena fatto la registrazione, ricarica la pagina.</Notice>}
        {rows.map((m) => (
          <Card key={m.id}>
            <p className="text-xs text-ink-500">
              {fmtDateTime(m.createdAt)} · a {m.toEmail} · modello {m.templateKey}
            </p>
            <h3>{m.subject}</h3>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-ink-700">{linkify(m.body)}</pre>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
