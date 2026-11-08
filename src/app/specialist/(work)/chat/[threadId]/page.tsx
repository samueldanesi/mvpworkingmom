import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { sendMessageAction } from "@/app/actions/chat";
import { ChatView } from "@/components/ChatView";
import { Button, Card, PageHeader, Sp } from "@/components/ui";
import { db, users } from "@/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getThread } from "@/server/chat";

/** S-08: modelli di risposta e proposta di appuntamenti (rimanda alla prenotazione, anche ricorrente). */
const TEMPLATES = [
  ["Benvenuta/o", "Ciao, grazie per avermi scritto. Ti rispondo appena posso, di norma entro un giorno lavorativo."],
  ["Promemoria compiti", "Ricordati di annotare con calma quanto ne parlavamo: lo riprendiamo insieme alla prossima seduta."],
] as const;

export default async function SpecialistThread({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { threadId } = await params;
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const t = await getThread(threadId, u.id);
  if (!t || t.specialistId !== u.id) notFound();
  const [client] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, t.userId)).limit(1);
  await audit(u, "view_chat", "thread", t.id);
  const proposal = `Ti propongo di fissare la prossima seduta (anche ricorrente, ogni settimana) da qui: ${env.appUrl}/app/book/${u.id}?kind=session`;
  return (
    <>
      <PageHeader title={client?.name ?? "Utente"} />
      <Sp sp={sp} />
      <ChatView threadId={t.id} actorId={u.id} tz={u.timezone} otherName={client?.name ?? ""} />
      <Card className="mt-4 space-y-2">
        <h3>Modelli di risposta</h3>
        <div className="flex flex-wrap gap-2">
          {[...TEMPLATES, ["Proponi appuntamento", proposal] as const].map(([label, text]) => (
            <form key={label} action={sendMessageAction}><input type="hidden" name="threadId" value={t.id} /><input type="hidden" name="text" value={text} /><Button variant="secondary" type="submit">{label}</Button></form>
          ))}
        </div>
      </Card>
    </>
  );
}
