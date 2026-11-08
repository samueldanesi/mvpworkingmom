import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, notifications } from "@/db";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { Logo } from "./ui";

export type NavItem = { href: string; label: string };

const ROLE_LABEL: Record<string, string> = {
  user: "Utente",
  specialist: "Specialista",
  hr: "Referente HR",
  admin: "Admin",
  clinical_lead: "Responsabile clinico",
};

export async function Shell({ user, nav, children, wide }: { user: SessionUser; nav: NavItem[]; children: React.ReactNode; wide?: boolean }) {
  const [{ n }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Logo href="/" />
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {nav.map((i) => (
              <Link key={i.href} href={i.href} className="rounded-md px-3 py-1.5 text-ink-700 no-underline hover:bg-ink-50 hover:no-underline">
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/notifications" className="relative rounded-md px-2 py-1 text-ink-700 no-underline hover:bg-ink-50" aria-label="Notifiche">
              Notifiche{n > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">{n}</span>}
            </Link>
            <span className="hidden text-ink-500 sm:inline">
              {user.fullName ?? user.email} · {ROLE_LABEL[user.role]}
            </span>
            <form action={logoutAction}>
              <button className="rounded-md px-2 py-1 text-ink-700 hover:bg-ink-50">Esci</button>
            </form>
          </div>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex gap-3 text-sm">
            <Link href="/login">Accedi</Link>
            <Link href="/register" className="font-medium">
              Registrati
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-ink-500">
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Termini</Link> · <Link href="/faq">FAQ</Link> ·{" "}
        <Link href="/specialists/apply">Sei uno specialista? Candidati</Link>
      </footer>
    </div>
  );
}
