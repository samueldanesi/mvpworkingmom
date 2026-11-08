import QRCode from "qrcode";
import { begin2faAction, confirm2faAction, disable2faAction } from "@/app/actions/auth";
import { PublicShell } from "@/components/Shell";
import { Badge, Button, Card, Field, Notice, Sp } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { decryptText } from "@/lib/crypto";
import { TWO_FA_ROLES } from "@/lib/env";
import { otpauthUri } from "@/lib/totp";

export const metadata = { title: "Verifica a due fattori" };

export default async function TwoFaSetup({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ skip2fa: true });
  const required = (TWO_FA_ROLES as readonly string[]).includes(u.role);
  let qr: string | null = null;
  let secret: string | null = null;
  if (!u.totpEnabled && u.totpSecretEnc) {
    secret = decryptText(u.totpSecretEnc);
    qr = await QRCode.toDataURL(otpauthUri(secret, u.email), { margin: 1, width: 220 });
  }
  return (
    <PublicShell>
      <div className="mx-auto max-w-md space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h1>Verifica a due fattori</h1>
            {u.totpEnabled ? <Badge tone="green">Attiva</Badge> : <Badge tone="amber">Non attiva</Badge>}
          </div>
          <Sp sp={sp} />
          {required && !u.totpEnabled && <Notice>Per il tuo ruolo il 2FA è obbligatorio: attivalo per proseguire.</Notice>}
          {u.totpEnabled ? (
            <>
              <p className="text-sm text-ink-600">Ad ogni accesso ti verrà chiesto un codice dalla tua app di autenticazione.</p>
              {!required && (
                <form action={disable2faAction}>
                  <Button variant="secondary">Disattiva</Button>
                </form>
              )}
            </>
          ) : secret && qr ? (
            <>
              <p className="text-sm text-ink-600">Inquadra il QR con Google Authenticator, 1Password o simili, poi inserisci il codice.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code per il 2FA" width={220} height={220} className="mx-auto" />
              <p className="break-all text-center text-xs text-ink-500">Oppure inserisci a mano: {secret}</p>
              <form action={confirm2faAction} className="space-y-3">
                <Field label="Codice a 6 cifre">
                  <input name="code" inputMode="numeric" maxLength={7} required />
                </Field>
                <Button className="w-full">Attiva</Button>
              </form>
            </>
          ) : (
            <form action={begin2faAction}>
              <Button>Inizia la configurazione</Button>
            </form>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
