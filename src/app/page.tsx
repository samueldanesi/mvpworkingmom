import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { LinkButton, Card } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";

export default async function Home() {
  const u = await getUser();
  return (
    <PublicShell>
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-5">
          <h1 className="text-4xl font-semibold leading-tight text-ink-900">Gli specialisti giusti per la tua famiglia, quando ne hai bisogno.</h1>
          <p className="text-lg text-ink-600">
            Psicologi, logopedisti, consulenti del sonno e altri professionisti per genitori che lavorano. Rispondi a poche domande, ricevi tre proposte e fai un
            colloquio gratuito di 20 minuti.
          </p>
          <div className="flex flex-wrap gap-3">
            {u ? <LinkButton href={homeFor(u.role)}>Vai alla tua area</LinkButton> : <LinkButton href="/register">Inizia ora</LinkButton>}
            {!u && <LinkButton href="/login" variant="secondary">Ho già un account</LinkButton>}
          </div>
          <p className="text-sm text-ink-500">Hai un codice aziendale? Lo inserisci dopo la registrazione.</p>
        </div>
        <Card className="space-y-3">
          <h2>Come funziona</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
            <li>Ti registri e rispondi a un breve questionario.</li>
            <li>Ti proponiamo 2-3 specialisti in linea con le tue esigenze.</li>
            <li>Prenoti un colloquio gratuito di 20 minuti in videochiamata.</li>
            <li>Decidi se proseguire o cambiare specialista, senza spiegazioni.</li>
          </ol>
          <p className="text-xs text-ink-500">
            Il servizio non è adatto a emergenze né a situazioni di rischio per sé o per altri: in quel caso chiama il 112. <Link href="/faq">Domande frequenti</Link>
          </p>
        </Card>
      </section>
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Per i genitori", "Prenoti su slot reali, paghi in sicurezza e scarichi la fattura per ogni seduta."],
          ["Per le aziende", "Un benefit con codici dedicati, report solo aggregati e anonimi, utili per le certificazioni."],
          ["Per gli specialisti", "Agenda, videochiamate, chat e compensi in un unico spazio di lavoro."],
        ].map(([t, d]) => (
          <Card key={t}>
            <h3>{t}</h3>
            <p className="mt-1 text-sm text-ink-600">{d}</p>
          </Card>
        ))}
      </section>
    </PublicShell>
  );
}
