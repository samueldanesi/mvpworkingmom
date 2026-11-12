import { LegalBlocks } from "@/components/Legal";
import { CookiePrefsLink } from "@/components/CookieBanner";
import { PublicShell } from "@/components/Shell";
import { COOKIE_POLICY } from "@/lib/legal";

export const metadata = { title: "Cookie policy" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1>{COOKIE_POLICY.title}</h1>
        <p className="text-sm"><CookiePrefsLink>Modifica le tue preferenze sui cookie</CookiePrefsLink></p>
        <LegalBlocks blocks={COOKIE_POLICY.blocks} />
        <section className="space-y-2">
          <h2 className="pt-4 text-xl font-semibold">Strumenti di Tracciamento «necessari» usati da questa piattaforma</h2>
          <div className="overflow-x-auto rounded-xl border border-ink-100">
            <table>
              <thead><tr><th>Nome</th><th>A cosa serve</th><th>Durata</th></tr></thead>
              <tbody>
                <tr><td>wm_session</td><td>Mantiene l&apos;accesso dopo il login.</td><td>Sessione</td></tr>
                <tr><td>wm_code</td><td>Ricorda il codice aziendale ricevuto con un link o un QR, fino alla registrazione.</td><td>7 giorni</td></tr>
                <tr><td>wm_consent</td><td>Ricorda le tue scelte sui cookie.</td><td>12 mesi</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
