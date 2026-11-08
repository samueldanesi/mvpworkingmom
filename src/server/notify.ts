import { db, notifications } from "@/db";

export async function notify(userId: string, text: string, href?: string) {
  await db.insert(notifications).values({ userId, text, href: href ?? null });
}
