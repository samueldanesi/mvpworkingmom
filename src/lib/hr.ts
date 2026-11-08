import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { companies, db } from "@/db";
import { requireUser } from "./auth";

/** Ogni pagina HR lavora solo sull'azienda dell'utente loggato (T-02): mai un id azienda dal client. */
export async function requireHr() {
  const u = await requireUser({ roles: ["hr"] });
  if (!u.companyId) redirect("/login");
  const [co] = await db.select().from(companies).where(eq(companies.id, u.companyId!)).limit(1);
  if (!co) redirect("/login");
  return { u, co };
}
