import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChatView } from "@/components/ChatView";
import { PageHeader, Sp } from "@/components/ui";
import { db, specialistProfiles, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { getThread } from "@/server/chat";

export default async function UserThread({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { threadId } = await params;
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const t = await getThread(threadId, u.id);
  if (!t) notFound();
  const [spec] = await db.select().from(users).where(eq(users.id, t.specialistId)).limit(1);
  const [prof] = await db.select().from(specialistProfiles).where(eq(specialistProfiles.userId, t.specialistId)).limit(1);
  return (
    <>
      <PageHeader title={spec.fullName ?? "Specialista"} />
      <Sp sp={sp} />
      <ChatView threadId={t.id} actorId={u.id} tz={u.timezone} otherName={spec.fullName ?? ""} responseHours={prof?.responseHours} />
    </>
  );
}
