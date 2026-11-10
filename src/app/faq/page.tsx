import { PublicShell } from "@/components/Shell";

export const metadata = { title: "Domande frequenti" };

const FAQ: [string, string][] = [
  ["Come funziona il colloquio gratuito?", "Dopo il questionario scegli uno specialista tra quelli proposti e prenoti un colloquio di 20 minuti in videochiamata. È gratuito e senza impegno."],
  ["Posso cambiare specialista?", "Sì, in qualsiasi momento, gratuitamente e senza dover dare spiegazioni. Gli appuntamenti futuri con lo specialista precedente vengono rimborsati."],
  ["Come funziona la disdetta?", "Puoi annullare o spostare una seduta fino a 24 ore prima senza costi. Oltre il preavviso la seduta resta a pagamento."],
  ["Come pago?", "Con carta, Apple Pay o Google Pay. I dati della carta sono gestiti dal fornitore di pagamento e non passano dai nostri server. Se la tua azienda offre il servizio, le sedute incluse vengono usate per prime."],
  ["La mia azienda può vedere se uso il servizio?", "No. L'azienda riceve solo report aggregati e anonimi, e solo quando il gruppo è abbastanza numeroso da non poter risalire a una persona."],
  ["Chi legge la chat e le note?", "Solo tu e il tuo specialista. Il team di Working Mom e l'azienda non leggono chat né note."],
  ["Posso usare la chat in caso di emergenza?", "No. La chat non è un canale di emergenza. In caso di pericolo chiama il 112."],
  ["Posso cancellare i miei dati?", "Sì, dalle Impostazioni puoi esportare o cancellare l'account. Restano solo i documenti che la legge ci impone di conservare, come le fatture."],
];

export default function Faq() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-4xl font-bold">Domande frequenti</h1>
        <div className="divide-y divide-ink-100 rounded-3xl border border-ink-100">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">{q}<span className="text-xl text-brand-600 transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 text-ink-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
