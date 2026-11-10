/** Smoke test: apre ogni pagina come ogni ruolo demo e segnala errori 5xx. Richiede il server su localhost:3000 e il DB demo. npm run smoke */
import "../src/db/loadenv";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { appointments, companies, db, invoices, reports, tickets, threads, users, sqlClient, specialistProfiles } from "../src/db";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const key = new TextEncoder().encode(process.env.AUTH_SECRET!);
const tok = (sub: string, role: string) => new SignJWT({ role, purpose: "session" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setIssuedAt().setExpirationTime("1h").sign(key);

async function main() {
  const u = async (email: string) => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  const anna = await u("anna@acme.test"), laura = await u("laura@specialisti.test"), hr = await u("hr@acme.test"), admin = await u("admin@workingmom.test"), clin = await u("clinica@workingmom.test"), nuova = await u("nuova@test.it"), cand = await u("candidata@specialisti.test");
  const appt = (await db.select().from(appointments).where(eq(appointments.userId, anna.id)))[0];
  const th = (await db.select().from(threads).where(eq(threads.userId, anna.id)))[0];
  const rep = (await db.select().from(reports))[0];
  const inv = (await db.select().from(invoices))[0];
  const co = (await db.select().from(companies))[0];
  const tk = (await db.select().from(tickets))[0];
  const spec = (await db.select().from(specialistProfiles))[0];
  void spec;
  const pub = ["/", "/login", "/register", "/faq", "/privacy", "/terms", "/emergency", "/aziende", "/join", "/join/ACME2026", "/forgot", "/specialists/apply", "/survey/demo-acme-r2", "/manifest.webmanifest", "/sw.js", "/offline.html", "/dev/mailbox"];
  const roles: [string, { id: string; role: string }, string[]][] = [
    ["utente Anna", { id: anna.id, role: "user" }, ["/app", "/app/matching", "/app/specialists", `/app/specialists/${laura.id}`, `/app/book/${laura.id}?kind=session`, "/app/appointments", appt ? `/app/appointments/${appt.id}` : "/app/appointments", "/app/chat", th ? `/app/chat/${th.id}` : "/app/chat", "/app/checkin", "/app/diary", "/app/invoices", "/app/settings", "/app/support", "/notifications", "/api/account/export", appt ? `/api/appointments/${appt.id}/ics` : "/app", inv ? `/api/invoices/${inv.id}/pdf` : "/app/invoices"]],
    ["utente nuova", { id: nuova.id, role: "user" }, ["/onboarding", "/onboarding/consents", "/onboarding/questionnaire", "/onboarding/checkin"]],
    ["specialista Laura", { id: laura.id, role: "specialist" }, ["/specialist", "/specialist/agenda", "/specialist/clients", "/specialist/chat", th ? `/specialist/chat/${th.id}` : "/specialist/chat", "/specialist/earnings", "/specialist/profile", "/specialist/ratings", "/specialist/reports", "/specialist/support", appt ? `/specialist/appointments/${appt.id}` : "/specialist", "/api/specialist/statement"]],
    ["candidata", { id: cand.id, role: "specialist" }, ["/specialist", "/specialists/apply"]],
    ["HR", { id: hr.id, role: "hr" }, ["/hr", "/hr/program", "/hr/codes", "/hr/credits", "/hr/reports", rep ? `/hr/reports/${rep.id}` : "/hr/reports", rep ? `/api/reports/${rep.id}/pdf` : "/hr", rep ? `/api/reports/${rep.id}/csv` : "/hr", "/hr/launch", "/hr/surveys", "/hr/events"]],
    ["admin", { id: admin.id, role: "admin" }, ["/admin", "/admin/companies", `/admin/companies/${co.id}`, "/admin/users", `/admin/users/${anna.id}?reason=${encodeURIComponent("Verifica pagamento o rimborso")}`, "/admin/specialists", "/admin/support", tk ? `/admin/support/${tk.id}` : "/admin/support", "/admin/finance", "/admin/clinical", "/admin/gdpr", "/admin/audit", "/admin/emails", "/admin/integrations", "/admin/settings"]],
    ["resp. clinico", { id: clin.id, role: "clinical_lead" }, ["/admin", "/admin/clinical", "/admin/specialists"]],
  ];
  let bad = 0, total = 0;
  const hit = async (label: string, path: string, cookie?: string) => {
    total++;
    const r = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie: `wm_session=${cookie}` } : {} });
    const flag = r.status >= 500 || r.status === 404 ? "✗" : "✓";
    if (flag === "✗") bad++;
    if (flag === "✗" || process.env.VERBOSE) console.log(`${flag} ${r.status} [${label}] ${path}${r.headers.get("location") ? " → " + r.headers.get("location") : ""}`);
  };
  for (const p of pub) await hit("pubblico", p);
  for (const [label, who, paths] of roles) {
    const c = await tok(who.id, who.role);
    for (const p of paths) await hit(label, p, c);
  }
  console.log(`\n${total} pagine controllate, ${bad} con problemi.`);
  sqlClient.close();
  process.exit(bad ? 1 : 0);
}
main();
