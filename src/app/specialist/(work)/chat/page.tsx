import Link from "next/link";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { listThreads } from "@/server/chat";

export const metadata = { title: "Chat" };

export default async function SpecialistChats() {
  const u = await requireUser({ roles: ["specialist"] });
  const threads = await listThreads(u.id, "specialist");
  return (
    <>
      <PageHeader title="Chat" />
      {threads.length === 0 ? <Empty>Nessuna conversazione.</Empty> : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Card key={t.thread.id} className="flex items-center justify-between">
              <div className="text-sm"><Link href={`/specialist/chat/${t.thread.id}`} className="font-medium">{t.otherName}</Link><p className="line-clamp-1 text-ink-500">{t.last ? `${t.last.text || "Allegato"} · ${fmtDateTime(t.last.at, u.timezone)}` : "Nessun messaggio"}</p></div>
              {t.unread > 0 && <Badge tone="brand">{t.unread} nuovi</Badge>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
