import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { PublicShell } from "@/components/Shell";
import { Card, Notice } from "@/components/ui";
import { db, emailOutbox } from "@/db";
import { env } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Posta simulata: solo in sviluppo. */
export default async function Mailbox() {
  if (env.isProd) notFound();
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(40);
  const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((p, i) => (/^https?:/.test(p) ? <a key={i} href={p}>{p}</a> : p));
  return (
    <PublicShell>
      <div className="space-y-4">
        <h1>Posta simulata</h1>
        <Notice tone="blue">Solo sviluppo. In produzione le email passano da un provider transazionale con server in UE.</Notice>
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
