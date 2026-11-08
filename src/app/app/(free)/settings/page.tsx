import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { createFamilyInviteAction, deleteAccountAction, setConsentAction, updateProfileAction } from "@/app/actions/user";
import { Badge, Button, Card, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { companies, consents, db, familyInvites } from "@/db";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Impostazioni" };

const TZ = ["Europe/Rome", "Europe/London", "Europe/Paris", "Europe/Madrid", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"];

/** U-17: modifica dati, gestione consensi, esportazione e cancellazione dell'account. */
export default async function Settings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const active = await db.select().from(consents).where(and(eq(consents.userId, u.id), sql`${consents.revokedAt} is null`));
  const has = (k: string) => active.some((c) => c.kind === k);
  const [co] = u.companyId ? await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
  const invites = u.coverageKind === "employee" ? await db.select().from(familyInvites).where(eq(familyInvites.employeeId, u.id)) : [];

  return (
    <>
      <PageHeader title="Impostazioni" />
      <Sp sp={sp} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4">
          <h2>I tuoi dati</h2>
          <form action={updateProfileAction} className="space-y-3">
            <Field label="Nome e cognome"><input name="fullName" defaultValue={u.fullName ?? ""} required /></Field>
            <Field label="Email" hint="Per cambiarla contatta l'assistenza."><input value={u.email} disabled readOnly /></Field>
            <Field label="Telefono (facoltativo)"><input name="phone" defaultValue={u.phone ?? ""} /></Field>
            <Field label="Fuso orario">
              <select name="timezone" defaultValue={u.timezone}>{[...new Set([u.timezone, ...TZ])].map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Genere" hint="Solo per statistiche aggregate.">
                <select name="gender" defaultValue={u.gender ?? ""}><option value="">Preferisco non dirlo</option><option value="f">Donna</option><option value="m">Uomo</option><option value="x">Altro</option></select>
              </Field>
              <Field label="Anno di nascita"><input name="birthYear" type="number" defaultValue={u.birthYear ?? ""} min={1940} max={2010} /></Field>
            </div>
            {co && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sede" hint="Facoltativo, solo per report aggregati."><input name="site" defaultValue={u.site ?? ""} /></Field>
                <Field label="Livello" hint="Facoltativo."><input name="jobLevel" defaultValue={u.jobLevel ?? ""} /></Field>
              </div>
            )}
            <Button>Salva</Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h2>Consensi</h2>
            {([["health_data", "Trattamento dei dati sulla salute"], ["aggregate_use", "Uso aggregato e anonimo per i report aziendali"]] as const).map(([k, label]) => (
              <form key={k} action={setConsentAction} className="flex items-center justify-between gap-3 text-sm">
                <span>{label} {has(k) ? <Badge tone="green">Attivo</Badge> : <Badge>Non attivo</Badge>}</span>
                <input type="hidden" name="kind" value={k} />
                <input type="hidden" name="on" value={has(k) ? "0" : "1"} />
                <Button variant="secondary">{has(k) ? "Revoca" : "Concedi"}</Button>
              </form>
            ))}
            <p className="text-xs text-ink-500">Revocando il consenso sui dati sanitari non potrai più prenotare. I dati già raccolti restano finché non cancelli l&apos;account.</p>
          </Card>

          {co && u.coverageKind === "employee" && co.familyMax > 0 && (
            <Card className="space-y-3">
              <h2>Invita un familiare</h2>
              <p className="text-sm text-ink-600">La convenzione si estende ai tuoi familiari ({co.familyDiscountPct}% di sconto, fino a {co.familyMax}). Non vedrai i loro dati e loro non vedranno i tuoi.</p>
              <ul className="text-sm">{invites.map((i) => <li key={i.id} className="font-mono">{i.code} {i.usedBy ? <Badge tone="gray">Usato</Badge> : <Badge tone="green">Disponibile</Badge>}</li>)}</ul>
              {invites.length < co.familyMax && <form action={createFamilyInviteAction}><Button variant="secondary">Crea codice</Button></form>}
            </Card>
          )}

          <Card className="space-y-3">
            <h2>I tuoi diritti</h2>
            <p className="text-sm text-ink-600">Puoi scaricare tutti i dati che abbiamo su di te o cancellare l&apos;account.</p>
            <a href="/api/account/export" className="inline-block text-sm">Scarica i miei dati (JSON)</a>
            <details className="rounded-lg border border-red-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-red-700">Cancella il mio account</summary>
              <form action={deleteAccountAction} className="mt-3 space-y-3">
                <Notice tone="red">Chat, questionario e dati personali vengono rimossi in modo definitivo. Restano solo i documenti che la legge ci obbliga a conservare (es. fatture). Gli appuntamenti futuri vengono annullati e rimborsati.</Notice>
                <Field label="Password"><input name="password" type="password" required /></Field>
                <Field label='Scrivi "CANCELLA" per confermare'><input name="confirm" required /></Field>
                <Button variant="danger">Cancella definitivamente</Button>
              </form>
            </details>
          </Card>

          <Card className="text-sm"><Link href="/account/2fa">Verifica a due fattori</Link></Card>
        </div>
      </div>
    </>
  );
}
