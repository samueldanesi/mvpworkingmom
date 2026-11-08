import { and, eq } from "drizzle-orm";
import { db, specialistProfiles, users } from "@/db";
import { nextSlot } from "./slotsDb";

export type PublicSpecialist = {
  id: string;
  name: string;
  profile: typeof specialistProfiles.$inferSelect;
  nextSlot: Date | null;
};

export async function bookableSpecialists(withSlots = true): Promise<PublicSpecialist[]> {
  const rows = await db
    .select({ u: users, p: specialistProfiles })
    .from(specialistProfiles)
    .innerJoin(users, eq(users.id, specialistProfiles.userId))
    .where(and(eq(specialistProfiles.status, "approved"), eq(specialistProfiles.published, true), eq(users.status, "active")));
  const out: PublicSpecialist[] = [];
  for (const r of rows) {
    out.push({ id: r.u.id, name: r.u.fullName ?? "Specialista", profile: r.p, nextSlot: withSlots ? await nextSlot(r.u.id, "intro") : null });
  }
  return out;
}

export async function publicSpecialist(id: string): Promise<PublicSpecialist | null> {
  const [r] = await db
    .select({ u: users, p: specialistProfiles })
    .from(specialistProfiles)
    .innerJoin(users, eq(users.id, specialistProfiles.userId))
    .where(and(eq(specialistProfiles.userId, id), eq(specialistProfiles.status, "approved"), eq(specialistProfiles.published, true)))
    .limit(1);
  if (!r) return null;
  return { id: r.u.id, name: r.u.fullName ?? "Specialista", profile: r.p, nextSlot: await nextSlot(id, "intro") };
}
