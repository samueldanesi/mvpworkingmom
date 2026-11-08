import { PublicShell } from "@/components/Shell";
import { Card } from "@/components/ui";

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
      <div className="mx-auto max-w-2xl space-y-3">
        <h1>Domande frequenti</h1>
        {FAQ.map(([q, a]) => (
          <Card key={q}>
            <h3>{q}</h3>
            <p className="mt-1 text-sm text-ink-600">{a}</p>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
