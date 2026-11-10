import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { LinkButton } from "@/components/ui";

export const metadata = { title: "Per le aziende" };

export default function Business() {
  return (
    <PublicShell bare>
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-16">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight text-night-900 sm:text-5xl">Il servizio per i tuoi dipendenti</h1>
        <p className="max-w-2xl text-lg text-ink-600">Sedute incluse per i dipendenti, sconti sulle successive, estensione ai familiari e una dashboard con indicatori aggregati e anonimi, utili per le certificazioni UNI/PdR 125:2022 e 192:2026.</p>
        <div className="flex gap-4"><LinkButton href="/join">Ho un codice aziendale</LinkButton><LinkButton href="/register" variant="secondary">Registrati</LinkButton></div>
      </section>
      <section className="bg-blush-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {[
            ["Anonimato reale", "L'HR non vede mai chi usa il servizio. Nessun indicatore sotto la soglia minima di 10 persone."],
            ["Codici e crediti", "Codici aziendali, monouso o per dominio email, con registro dei crediti e avvisi di scadenza."],
            ["Report e indagine", "Dashboard per periodo, sede e area; report PDF e CSV; indagine anonima a tutti i dipendenti."],
          ].map(([t, d]) => <div key={t} className="rounded-3xl bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 text-ink-600">{d}</p></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-3xl space-y-3 px-4 py-14 text-ink-700">
        <h2 className="text-2xl font-bold">Perché conviene</h2>
        <p>Le imprese certificate UNI/PdR 125:2022 accedono a un esonero contributivo fino all&apos;1% (massimo 50.000 € l&apos;anno) e a un contributo fino a 12.000 € sui costi della prima certificazione. La certificazione la rilascia un ente accreditato: Working Mom fornisce le evidenze misurabili. <Link href="/faq">Domande frequenti</Link></p>
      </section>
    </PublicShell>
  );
}
