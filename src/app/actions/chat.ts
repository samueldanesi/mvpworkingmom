"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, field } from "@/lib/flash";
import { ChatError, sendMessage } from "@/server/chat";

export async function sendMessageAction(fd: FormData) {
  const u = await requireUser({ roles: ["user", "specialist"] });
  const threadId = field(fd, "threadId");
  const base = u.role === "specialist" ? `/specialist/chat/${threadId}` : `/app/chat/${threadId}`;
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  try {
    await sendMessage(threadId, u.id, field(fd, "text"), files);
  } catch (e) {
    if (e instanceof ChatError) fail(base, e.message);
    throw e;
  }
  revalidatePath(base);
  redirect(base);
}
