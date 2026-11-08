import QRCode from "qrcode";
import { desc, eq } from "drizzle-orm";
import { createCodeAction, revokeCodeAction, updateAccessRulesAction } from "@/app/actions/hr";
import { Badge, Button, Card, Empty, Field, PageHeader, Sp } from "@/components/ui";
import { accessCodes, db } from "@/db";
import { env } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import { requireHr } from "@/lib/hr";

export const metadata = { title: "Codici di accesso" };

/** B-03: codice aziendale unico e/o codici monouso, domini ammessi, scadenza e revoca, link e QR di invito. */
export default async function Codes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { co } = await requireHr();
  const codes = await db.select().from(accessCodes).where(eq(accessCodes.companyId, co.id)).orderBy(desc(accessCodes.createdAt));
  const first = codes.find((c) => !c.revokedAt && c.kind === "shared");
  const qr = first ? await QRCode.toDataURL(`${env.appUrl}/join/${first.code}`, { margin: 1, width: 160 }) : null;
  return (
    <>
      <PageHeader title="Codici di accesso" subtitle="L'azienda non sa mai chi li usa: vede solo quanti ne sono stati utilizzati." />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-0">
            {codes.length === 0 ? <div className="p-5"><Empty>Nessun codice.</Empty></div> : (
              <table><thead><tr><th>Codice</th><th>Tipo</th><th>Usi</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead><tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt && c.expiresAt < new Date();
                  const used = c.maxUses !== null && c.usedCount >= c.maxUses;
                  return (
                    <tr key={c.id}>
                      <td className="font-mono">{c.code}</td><td>{c.kind === "shared" ? "Aziendale" : "Monouso"}</td>
                      <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td><td>{c.expiresAt ? fmtDate(c.expiresAt) : "—"}</td>
                      <td>{c.revokedAt ? <Badge tone="red">Revocato</Badge> : expired ? <Badge tone="amber">Scaduto</Badge> : used ? <Badge>Esaurito</Badge> : <Badge tone="green">Attivo</Badge>}</td>
                      <td>{!c.revokedAt && <form action={revokeCodeAction}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-red-700 underline">Revoca</button></form>}</td>
                    </tr>
                  );
                })}
              </tbody></table>
            )}
          </Card>
          <Card className="space-y-3">
            <h2>Nuovo codice</h2>
            <form action={createCodeAction} className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo"><select name="kind"><option value="shared">Codice aziendale (uno per tutti)</option><option value="single">Codici monouso</option></select></Field>
              <Field label="Codice personalizzato" hint="Facoltativo, solo per il tipo aziendale."><input name="code" placeholder="Es. ACME2026" /></Field>
              <Field label="Quanti monouso"><input name="howMany" type="number" min={1} max={200} defaultValue={1} /></Field>
              <Field label="Scadenza"><input name="expiresAt" type="date" /></Field>
              <div className="sm:col-span-2"><Button>Crea</Button></div>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2>Accesso per email</h2>
            <form action={updateAccessRulesAction} className="space-y-3">
              <Field label="Domini email ammessi" hint="Uno per riga o separati da virgola. Chi ha un indirizzo di questi domini può attivare il benefit senza digitare il codice."><textarea name="domains" rows={3} defaultValue={co.allowedDomains.join("\n")} /></Field>
              <label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" name="personal" defaultChecked={co.allowPersonalEmail} />Consenti anche email personali (con codice)</label>
              <Button variant="secondary">Salva</Button>
            </form>
          </Card>
          {first && qr && (
            <Card className="space-y-2 text-center">
              <h2>Invito</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code di invito" className="mx-auto" width={160} height={160} />
              <p className="break-all text-xs text-ink-500">{env.appUrl}/join/{first.code}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
