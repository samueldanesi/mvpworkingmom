import { desc, eq } from "drizzle-orm";
import { addDiaryAction, deleteDiaryAction } from "@/app/actions/extra";
import { Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { db, diaryEntries } from "@/db";
import { requireUser } from "@/lib/auth";
import { decryptText } from "@/lib/crypto";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Diario" };
const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

/** U-16: note personali su umore e progressi. Cifrate e private: l'azienda, il backoffice e lo specialista non le vedono mai. */
export default async function Diary({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const rows = await db.select().from(diaryEntries).where(eq(diaryEntries.userId, u.id)).orderBy(desc(diaryEntries.createdAt)).limit(50);
  return (
    <>
      <PageHeader title="Diario" subtitle="Annota pensieri e progressi. È privato: lo vedi solo tu." />
      <Sp sp={sp} />
      <Card className="mb-6">
        <form action={addDiaryAction} className="space-y-4">
          <Field label="Come ti senti oggi?">
            <div className="flex gap-2">
              {MOODS.map((m, i) => (
                <label key={m} className="cursor-pointer rounded-2xl border border-ink-200 px-4 py-2 text-2xl has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" name="mood" value={i + 1} defaultChecked={i === 2} className="sr-only" />{m}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Nota"><textarea name="content" rows={4} required placeholder="Cosa ti è passato per la testa?" /></Field>
          <Button>Salva nota</Button>
        </form>
      </Card>
      {rows.length === 0 ? <Empty>Ancora nessuna nota.</Empty> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2">
                <div className="flex items-center justify-between text-sm text-ink-500"><span>{MOODS[r.mood - 1]} · {fmtDateTime(r.createdAt, u.timezone)}</span>
                  <form action={deleteDiaryAction}><input type="hidden" name="id" value={r.id} /><button className="text-xs underline">Elimina</button></form></div>
                <p className="whitespace-pre-wrap text-ink-800">{decryptText(r.contentEnc)}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
