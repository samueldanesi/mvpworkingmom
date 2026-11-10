import Link from "next/link";
import { AnnouncementBar, PublicShell } from "@/components/Shell";
import { LinkButton } from "@/components/ui";
import { Portrait, PhoneMockup, StepIcon } from "@/components/Illustrations";
import { getUser } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";

export const metadata = { title: "Specialisti per la tua famiglia, online" };

// Allegato A §1: 49 € seduta individuale, 59 € coppia; colloquio gratuito di 20 minuti. Gli altri prezzi stanno nel profilo di ogni specialista (U-07).
const PRICES: { id: string; name: string; blurb: string; first: string; firstMin: string; next: string; nextMin: string }[] = [
  { id: "individuale", name: "Seduta individuale", blurb: "Un percorso con lo specialista che scegli tra le proposte.", first: "Gratis", firstMin: "20 minuti", next: "49 €", nextMin: "a seduta" },
  { id: "coppia", name: "Seduta di coppia", blurb: "Per affrontare insieme temi di coppia e co-genitorialità.", first: "Gratis", firstMin: "20 minuti", next: "59 €", nextMin: "a seduta" },
];

const FAQS: [string, string][] = [
  ["Come funziona il percorso online?", "Rispondi a poche domande, ricevi 2-3 specialisti in linea con le tue esigenze e prenoti un colloquio gratuito di 20 minuti in videochiamata, dal sito o dall'app. Dopo decidi se proseguire, interrompere o cambiare specialista."],
  ["Quanto costa?", "Il primo colloquio è gratuito. Le sedute successive partono da 49 €. Se la tua azienda ha attivato Working Mom, le prime sedute sono incluse e hai uno sconto sulle successive."],
  ["La mia azienda può sapere che uso il servizio?", "No. L'azienda riceve solo report aggregati e anonimi, e solo quando il gruppo è abbastanza numeroso da non poter risalire a una persona. Chat e note restano solo tue e del tuo specialista."],
  ["Posso cambiare specialista?", "Sì, quando vuoi, gratuitamente e senza spiegazioni."],
  ["E se devo disdire?", "Puoi spostare o annullare senza costi fino a 24 ore prima. Oltre il preavviso la seduta resta a pagamento."],
  ["Va bene per le emergenze?", "No. Working Mom non è adatto a emergenze né a rischio per sé o per altri: in quel caso chiama il 112."],
];

export default async function Home() {
  const u = await getUser();
  const cta = u ? homeFor(u.role) : "/register";
  return (
    <PublicShell bare>
      <AnnouncementBar />

      {/* HERO */}
      <div className="relative overflow-hidden bg-[url('/brand/pattern/pattern-rosa.svg')] bg-[length:420px] before:absolute before:inset-0 before:bg-white/80 before:content-['']">
      <section className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-night-900 sm:text-5xl">
            Gli specialisti <span className="bg-gradient-to-r from-night-800 to-brand-500 bg-clip-text text-transparent">giusti</span> per la tua famiglia, quando ne hai bisogno
          </h1>
          <ul className="space-y-1.5 text-[17px] text-ink-700">
            <li>Scegli tra <strong>psicologi, logopedisti, consulenti del sonno</strong> e altri specialisti</li>
            <li><strong>Primo colloquio gratuito</strong> di 20 minuti</li>
            <li><strong>Codice aziendale?</strong> Sedute incluse e report anonimi</li>
          </ul>
          <div className="flex flex-wrap items-center gap-5">
            <LinkButton href={cta} className="!px-6 !py-3 !text-base">{u ? "Vai alla tua area" : "Inizia ora"}</LinkButton>
            <Link href={cta} className="border-b-2 border-ink-300 pb-0.5 font-semibold !text-ink-900 no-underline hover:border-brand-500 hover:no-underline">Prova il colloquio gratuito</Link>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map((i) => <Portrait key={i} i={i} className={`w-28 rounded-xl shadow-sm sm:w-36 ${i === 1 ? "mt-8" : ""}`} />)}
        </div>
      </section>

      </div>

      {/* DARK BAND */}
      <section className="bg-night-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div className="-rotate-3 rounded-3xl border border-white/10 bg-night-800 p-8 shadow-[10px_10px_0_0_#5b4fa0]">
            <p className="text-xl font-semibold leading-snug">Psicologo, logopedista o consulente del sonno: a chi mi rivolgo?</p>
            <Link href="/faq" className="mt-4 inline-block !text-brand-300">Leggi le risposte</Link>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold !text-white">Professionisti scelti con cura</h2>
            <p className="text-white/80">Collaboriamo solo con professionisti <strong className="text-white">qualificati e selezionati</strong>: iscrizione all&apos;albo o all&apos;associazione, polizza RC e almeno tre anni di esperienza clinica.</p>
            <p className="text-white/80">Ogni candidatura è valutata dal responsabile clinico, che supervisiona la qualità e gestisce le segnalazioni.</p>
          </div>
        </div>
      </section>

      {/* STANDARD */}
      <section className="bg-brand-50 py-8">
        <p className="mb-4 text-center font-semibold text-ink-900">Pensato per aziende e famiglie</p>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-lg font-bold text-ink-400">
          {["UNI/PdR 125:2022", "UNI/PdR 192:2026", "GDPR · dati in UE", "Società Benefit"].map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section id="come-funziona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold">Come funziona</h2>
          <LinkButton href={cta}>Inizia ora</LinkButton>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {([
            [1, "Racconta cosa ti serve", "Poche domande per capire di cosa hai bisogno: sonno, rientro al lavoro, carico mentale, coppia e altro."],
            [2, "Ricevi le proposte", "In base alle tue risposte ti suggeriamo due o tre specialisti. Guardi il profilo e gli orari disponibili e scegli tu."],
            [3, "Parla con lo specialista", "Un colloquio gratuito di venti minuti per conoscervi. Se non ti convince, puoi smettere o cambiare specialista quando vuoi, senza costi."],
          ] as const).map(([n, t, d]) => (
            <div key={n} className="space-y-3">
              <StepIcon n={n} />
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="text-ink-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PREZZI */}
      <section id="prezzi" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16">
        <h2 className="mb-6 text-3xl font-bold">Quanto costa</h2>
        <div className="mb-8 flex flex-wrap gap-2">
          {PRICES.map((p) => <a key={p.id} href={`#p-${p.id}`} className="rounded-xl bg-ink-50 px-4 py-2 text-sm font-medium !text-ink-800 no-underline hover:bg-brand-50 hover:no-underline">{p.name}</a>)}
        </div>
        <div className="space-y-14">
          {PRICES.map((p, idx) => (
            <div key={p.id} id={`p-${p.id}`} className="grid scroll-mt-24 gap-8 md:grid-cols-2 md:items-center">
              <div className="space-y-5">
                <h3 className="text-3xl font-bold">{p.name}</h3>
                <p className="text-ink-600">{p.blurb}</p>
                <div className="grid max-w-sm grid-cols-2 items-end gap-y-5">
                  <div><p className="font-semibold">Primo colloquio</p><p className="text-sm text-ink-500">⏱ {p.firstMin}</p></div>
                  <p className="text-3xl font-bold text-night-700">{p.first}</p>
                  <div><p className="font-semibold">Sedute successive</p><p className="text-sm text-ink-500">⏱ {p.nextMin}</p></div>
                  <p className="text-5xl font-bold text-night-900">{p.next}</p>
                </div>
                <div className="flex items-center gap-5"><LinkButton href={cta}>Inizia dal questionario</LinkButton></div>
              </div>
              {idx === 0 ? <PhoneMockup /> : <div className="hidden h-64 rounded-[2rem] bg-blush-100 md:block" aria-hidden />}
            </div>
          ))}
          <p className="text-sm text-ink-500">Per le altre specialità (logopedia, consulenza del sonno e altre) durata e prezzo sono indicati nel profilo di ogni specialista.</p>
        </div>
      </section>

      {/* APP */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <PhoneMockup className="order-2 md:order-1" />
        <div className="order-1 space-y-4 md:order-2">
          <div className="flex gap-2">{["Sedute", "Chat", "Diario"].map((t) => <span key={t} className="rounded-full bg-night-900 px-4 py-1.5 text-sm font-semibold text-white">{t}</span>)}</div>
          <h2 className="text-3xl font-bold">Tutto in un'unica app</h2>
          <p className="text-ink-600">Prenota, sposta o disdici gli appuntamenti con pochi tocchi, scrivi al tuo specialista, condividi documenti e tieni il tuo diario.</p>
        </div>
      </section>

      {/* TRE COSE */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-8 text-3xl font-bold">Cosa trovi in più</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Ovunque tu sia", "Le sedute si fanno in videochiamata, dall'app o dal sito. Servono solo un posto tranquillo e una buona connessione."],
            ["Assistenza", "Se hai bisogno, apri un ticket: ti rispondiamo entro i tempi dichiarati. Trovi anche una pagina di domande frequenti."],
            ["Anche per la tua azienda", "Un codice aziendale per i dipendenti, con report aggregati e anonimi utili per le certificazioni."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-3xl bg-blush-100 p-6"><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 text-ink-700">{d}</p>{t === "Anche per la tua azienda" && <Link href="/aziende" className="mt-3 inline-block font-semibold">Scopri il canale aziende</Link>}</div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-32">
        <h2 className="mb-6 text-3xl font-bold">Domande frequenti</h2>
        <div className="divide-y divide-ink-100 rounded-3xl border border-ink-100">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">{q}<span className="text-xl text-brand-600 transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 text-ink-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* BARRA CTA FISSA */}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-night-900 py-3">
        <Link href={cta} className="pointer-events-auto rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold !text-white no-underline hover:bg-brand-700 hover:no-underline">Inizia ora</Link>
      </div>
    </PublicShell>
  );
}
