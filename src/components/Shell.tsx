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
    <div className="min-h-screen bg-blush-50">
      <header className="no-print sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Logo href="/" />
          <div className="flex items-center gap-2 text-sm">
            <Link href="/notifications" className="relative rounded-full px-3 py-1.5 font-medium text-ink-700 no-underline hover:bg-brand-50 hover:no-underline" aria-label="Notifiche">
              Notifiche{n > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">{n}</span>}
            </Link>
            <span className="hidden rounded-full bg-ink-50 px-3 py-1.5 text-ink-600 sm:inline">
              {user.fullName ?? user.email} · {ROLE_LABEL[user.role]}
            </span>
            <form action={logoutAction}>
              <button className="rounded-full border border-ink-200 px-4 py-1.5 font-medium text-ink-700 hover:bg-ink-50">Esci</button>
            </form>
          </div>
        </div>
        <nav className="border-t border-ink-100">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map((i) => (
              <Link key={i.href} href={i.href} className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-medium text-ink-700 no-underline hover:bg-brand-50 hover:text-brand-700 hover:no-underline">
                {i.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>{children}</main>
    </div>
  );
}

const SERVICES: [string, string][] = [
  ["Psicologia", ""], ["Psicologia perinatale", ""], ["Coppia e co-genitorialità", ""], ["Logopedia", ""],
  ["Consulenza del sonno", ""], ["Nutrizione", ""], ["Coaching e rientro al lavoro", ""],
];

function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full px-3 py-2 text-[15px] font-medium text-ink-900 hover:bg-ink-50 [&::-webkit-details-marker]:hidden">
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" className="transition group-open:rotate-180" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </summary>
      <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-xl">{children}</div>
    </details>
  );
}

const ddItem = "block rounded-xl px-3 py-2 text-sm text-ink-800 no-underline hover:bg-brand-50 hover:no-underline";

/** Barra annuncio con scorrimento (marquee), come sulle piattaforme di riferimento. */
export function AnnouncementBar() {
  const msg = "Hai un codice aziendale? Usalo dopo la registrazione per sedute incluse e sconti 🎁";
  return (
    <div className="no-print overflow-hidden bg-brand-100 py-2.5 text-sm font-medium text-brand-900">
      <div className="flex w-max animate-marquee gap-16 whitespace-nowrap">
        {Array.from({ length: 8 }, (_, i) => <span key={i}>{msg}</span>)}
      </div>
    </div>
  );
}

export function PublicShell({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="no-print sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Logo />
          <nav className="ml-6 hidden items-center md:flex">
            <Dropdown label="Specialisti">
              {SERVICES.map(([t, d]) => <Link key={t} href="/register" className={ddItem}><strong className="block text-ink-900">{t}</strong>{d && <span className="text-xs text-ink-500">{d}</span>}</Link>)}
            </Dropdown>
            <Dropdown label="Come funziona">
              <Link href="/#come-funziona" className={ddItem}>Il percorso in 3 passi</Link>
              <Link href="/#prezzi" className={ddItem}>Quanto costa</Link>
              <Link href="/faq" className={ddItem}>Domande frequenti</Link>
            </Dropdown>
            <Dropdown label="Aziende">
              <Link href="/aziende" className={ddItem}>Per le aziende</Link>
              <Link href="/join" className={ddItem}>Ho un codice aziendale</Link>
            </Dropdown>
          </nav>
          <span className="flex-1" />
          <div className="flex items-center gap-1 text-[15px]">
            <Link href="/specialists/apply" className="hidden rounded-full px-3 py-2 font-medium text-ink-900 no-underline hover:bg-ink-50 hover:no-underline sm:inline-block">Lavora con noi</Link>
            <Link href="/login" className="rounded-full px-3 py-2 font-medium text-ink-900 no-underline hover:bg-ink-50 hover:no-underline">Accedi</Link>
            <Link href="/register" className="ml-1 rounded-xl bg-brand-600 px-4 py-2 font-semibold !text-white no-underline hover:bg-brand-700 hover:no-underline">Registrati</Link>
          </div>
        </div>
      </header>
      {bare ? children : <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>}
      <footer className="no-print bg-night-900 text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-4">
          <div className="space-y-3 sm:col-span-1">
            <span className="text-xl font-bold text-white">working mom</span>
            <p className="text-sm text-white/60">Specialisti per la genitorialità, per le persone e per le aziende.</p>
          </div>
          {[
            ["Servizi", [["Trova uno specialista", "/register"], ["Quanto costa", "/#prezzi"], ["Domande frequenti", "/faq"]]],
            ["Aziende e professionisti", [["Canale aziende", "/aziende"], ["Ho un codice aziendale", "/join"], ["Sei uno specialista? Candidati", "/specialists/apply"]]],
            ["Informazioni", [["Privacy", "/privacy"], ["Termini", "/terms"], ["Emergenze: chiama il 112", "/emergency"]]],
          ].map(([t, links]) => (
            <div key={t as string} className="space-y-2 text-sm">
              <p className="font-semibold text-white">{t as string}</p>
              {(links as string[][]).map(([l, h]) => <Link key={h} href={h} className="block !text-white/70 no-underline hover:!text-white">{l}</Link>)}
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-white/40">Working Mom S.r.l. Società Benefit · Il servizio non è adatto alle emergenze: in caso di pericolo chiama il 112.</p>
      </footer>
    </div>
  );
}
