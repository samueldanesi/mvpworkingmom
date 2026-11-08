import { sendMessageAction } from "@/app/actions/chat";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Button, Notice } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { listMessages } from "@/server/chat";

/** U-12 / S-08: testo e allegati, orari di risposta dichiarati, non è un canale di emergenza. */
export async function ChatView({ threadId, actorId, tz, otherName, responseHours }: { threadId: string; actorId: string; tz: string; otherName: string; responseHours?: string | null }) {
  const msgs = await listMessages(threadId, actorId);
  return (
    <div className="space-y-4">
      <AutoRefresh />
      <Notice tone="amber">
        La chat <strong>non è un canale di emergenza</strong>. In caso di pericolo chiama il 112.{responseHours ? ` Orari di risposta: ${responseHours}.` : ""}
      </Notice>
      <div className="space-y-2 rounded-2xl border border-ink-100 bg-white p-4">
        {msgs.length === 0 && <p className="text-center text-sm text-ink-500">Nessun messaggio. Scrivi tu per primo a {otherName}.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-900"}`}>
              {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
              {m.attachments.map((a) => (
                <p key={a.id} className="mt-1">
                  <a href={`/api/attachments/${a.id}`} className={m.mine ? "!text-white underline" : ""}>📎 {a.filename}</a>
                </p>
              ))}
              <p className={`mt-1 text-[10px] ${m.mine ? "text-brand-100" : "text-ink-500"}`}>{fmtDateTime(m.at, tz)}</p>
            </div>
          </div>
        ))}
      </div>
      <form action={sendMessageAction} className="space-y-2" encType="multipart/form-data">
        <input type="hidden" name="threadId" value={threadId} />
        <textarea name="text" rows={3} placeholder="Scrivi un messaggio…" maxLength={4000} />
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" name="files" multiple className="!w-auto text-xs" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
          <Button>Invia</Button>
        </div>
      </form>
    </div>
  );
}
