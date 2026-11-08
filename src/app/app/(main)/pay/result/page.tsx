import { LinkButton, Card, str } from "@/components/ui";

export default async function PayResult({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ok = str(sp.ok) === "1";
  return (
    <Card className="mx-auto max-w-lg space-y-3">
      <h1>{ok ? "Pagamento completato" : "Pagamento non riuscito"}</h1>
      <p className="text-sm text-ink-600">
        {ok
          ? "La seduta è confermata. Trovi la fattura nella sezione Fatture e la conferma via email."
          : "Non è stato addebitato nulla e lo slot non è stato confermato. Puoi riprovare scegliendo di nuovo un orario."}
      </p>
      <div className="flex gap-2">
        <LinkButton href="/app/appointments">I miei appuntamenti</LinkButton>
        {ok && <LinkButton href="/app/invoices" variant="secondary">Fatture</LinkButton>}
      </div>
    </Card>
  );
}
