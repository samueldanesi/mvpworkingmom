import Link from "next/link";
import { grantConsentsAction } from "@/app/actions/onboarding";
import { Button, Card, Sp } from "@/components/ui";

export const metadata = { title: "Consensi" };

/** U-03 / P-01: consenso esplicito sui dati sanitari, separato da quello per i report aggregati. */
export default async function Consents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Card className="space-y-5">
      <h1>I tuoi dati, le tue scelte</h1>
      <Sp sp={sp} />
      <div className="space-y-2 text-sm text-ink-700">
        <p>
          Per metterti in contatto con gli specialisti trattiamo informazioni sulla tua salute e su quella della tua famiglia: sono dati particolari, protetti con cifratura e visibili
          solo a te e al professionista che scegli. Non li vede la tua azienda né il nostro team.
        </p>
        <p>
          Nell&apos;<Link href="/privacy">informativa</Link> trovi chi è titolare e responsabile del trattamento, quanto conserviamo i dati e come esercitare i tuoi diritti.
        </p>
      </div>
      <form action={grantConsentsAction} className="space-y-4">
        <label className="flex items-start gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
          <input type="checkbox" name="health" className="mt-1" />
          <span>
            <strong>Acconsento</strong> al trattamento dei miei dati sulla salute per ricevere il servizio (obbligatorio). Puoi revocare il consenso in ogni momento dalle Impostazioni.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-ink-200 p-3 text-sm font-normal">
          <input type="checkbox" name="aggregate" className="mt-1" />
          <span>
            <strong>Acconsento</strong> all&apos;uso dei miei dati in forma <em>aggregata e anonima</em> per i report del programma della mia azienda (facoltativo). Nessun dato individuale viene mai
            condiviso e nessun report è mostrato per gruppi piccoli.
          </span>
        </label>
        <Button>Continua</Button>
      </form>
    </Card>
  );
}
