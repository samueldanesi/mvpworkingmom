import { PublicShell } from "@/components/Shell";
import { Notice } from "@/components/ui";

export const metadata = { title: "Informativa privacy" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1>Informativa privacy</h1>
        <Notice>
          Testo segnaposto. Il testo definitivo (titolare e responsabile del trattamento, natura del servizio, basi giuridiche, tempi di conservazione, dati dei minori) deve essere
          fornito dalla Committente e rivisto da un legale prima del lancio (Allegato A, P-01, P-03, P-12, P-13).
        </Notice>
      </div>
    </PublicShell>
  );
}
