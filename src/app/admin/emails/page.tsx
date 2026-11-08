import { desc } from "drizzle-orm";
import { saveTemplateAction } from "@/app/actions/admin";
import { Button, Card, Field, PageHeader, Sp } from "@/components/ui";
import { db, emailOutbox, emailTemplates } from "@/db";
import { fmtDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guard";
import { DEFAULT_TEMPLATES } from "@/lib/mail";

export const metadata = { title: "Email" };

/** C-10 / T-05: modelli modificabili e registro degli invii. Variabili: {{name}}, {{link}}, {{when}}, {{specialist}}, {{kind}}… */
export default async function Emails({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await requireStaff("templates.edit");
  const saved = new Map((await db.select().from(emailTemplates)).map((t) => [t.key, t]));
  const log = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(40);
  return (
    <>
      <PageHeader title="Email e notifiche" />
      <Sp sp={sp} />
      <div className="space-y-4">
        {Object.entries(DEFAULT_TEMPLATES).map(([key, def]) => {
          const t = saved.get(key) ?? def;
          return (
            <Card key={key}><details><summary className="cursor-pointer text-sm font-medium">{key} <span className="font-normal text-ink-500">— {t.subject}</span></summary>
              <form action={saveTemplateAction} className="mt-3 space-y-2"><input type="hidden" name="key" value={key} /><Field label="Oggetto"><input name="subject" defaultValue={t.subject} required /></Field><Field label="Testo"><textarea name="body" rows={6} defaultValue={t.body} required /></Field><Button variant="secondary">Salva</Button></form>
            </details></Card>
          );
        })}
      </div>
      <h2 className="mb-2 mt-8">Registro invii</h2>
      <Card className="p-0"><table><thead><tr><th>Quando</th><th>A</th><th>Modello</th><th>Oggetto</th><th>Stato</th></tr></thead><tbody>{log.map((m) => <tr key={m.id}><td>{fmtDateTime(m.createdAt)}</td><td>{m.toEmail}</td><td>{m.templateKey}</td><td>{m.subject}</td><td>{m.status}</td></tr>)}</tbody></table></Card>
    </>
  );
}
