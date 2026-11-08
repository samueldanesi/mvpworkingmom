import { desc, eq } from "drizzle-orm";
import { reportAction } from "@/app/actions/specialist";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Sp, str } from "@/components/ui";
import { clinicalReports, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { EMERGENCY_NUMBERS } from "@/lib/constants";
import { decryptText } from "@/lib/crypto";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Segnalazioni" };

/** S-11: segnalazione formale al responsabile clinico, con protocollo di emergenza visibile. */
export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const rows = await db.select().from(clinicalReports).where(eq(clinicalReports.specialistId, u.id)).orderBy(desc(clinicalReports.createdAt));
  return (
    <>
      <PageHeader title="Segnalazioni" />
      <Sp sp={sp} />
      <Notice tone="red">
        <strong>Protocollo di emergenza.</strong> Davanti a un rischio imminente per l&apos;utente o per altri contatta subito i servizi di emergenza ({EMERGENCY_NUMBERS.map((n) => `${n.label} ${n.number}`).join(" · ")}), poi invia qui la segnalazione. Il responsabile clinico è l&apos;unico a vedere il contenuto.
      </Notice>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <h2>Nuova segnalazione</h2>
          <form action={reportAction} className="space-y-3">
            <input type="hidden" name="userId" value={str(sp.user) ?? ""} />
            <Field label="Gravità"><select name="severity"><option value="info">Informativa</option><option value="warning">Attenzione</option><option value="urgent">Urgente</option></select></Field>
            <Field label="Descrizione" hint="Il testo è cifrato e visibile solo al responsabile clinico."><textarea name="body" rows={6} required /></Field>
            <Button>Invia</Button>
          </form>
        </Card>
        <div className="space-y-2">
          <h2>Le tue segnalazioni</h2>
          {rows.length === 0 ? <Empty>Nessuna.</Empty> : rows.map((r) => (
            <Card key={r.id} className="space-y-1 text-sm">
              <div className="flex justify-between"><Badge tone={r.severity === "urgent" ? "red" : r.severity === "warning" ? "amber" : "gray"}>{r.severity}</Badge><Badge tone={r.status === "closed" ? "green" : "blue"}>{r.status}</Badge></div>
              <p className="whitespace-pre-wrap">{decryptText(r.bodyEnc)}</p>
              <p className="text-xs text-ink-500">{fmtDateTime(r.createdAt, u.timezone)}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
