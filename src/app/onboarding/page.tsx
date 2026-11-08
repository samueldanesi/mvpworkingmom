import { choosePathAction, redeemCodeAction, redeemDomainAction } from "@/app/actions/onboarding";
import { Button, Card, Field, LinkButton, Sp, str } from "@/components/ui";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { companies, db } from "@/db";
import { eq } from "drizzle-orm";
import { findCompanyByDomain } from "@/server/codes";
import { creditBalance } from "@/server/codes";

export const metadata = { title: "Benvenuta/o" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });

  if (u.companyId) {
    const [co] = await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1);
    const credits = await creditBalance(u.id);
    return (
      <Card className="space-y-4">
        <h1>Benefit attivato</h1>
        <p className="text-sm text-ink-600">
          Il programma di <strong>{co.name}</strong> è attivo{co.endsAt ? ` fino al ${fmtDate(co.endsAt)}` : ""}.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
          {u.coverageKind === "employee" ? (
            <>
              <li>
                <strong>{credits}</strong> sedute incluse a tua disposizione.
              </li>
              {co.discountPct > 0 && <li>{co.discountPct}% di sconto sulle sedute successive.</li>}
            </>
          ) : (
            <li>Convenzione estesa ai familiari: {co.familyDiscountPct}% di sconto sulle sedute.</li>
          )}
          <li>
            Specialità coperte:{" "}
            {co.coveredSpecialties.length ? co.coveredSpecialties.map((s) => SPECIALTIES[s] ?? s).join(", ") : "tutte"}.
          </li>
          <li>La tua azienda non vede mai chi usa il servizio né per cosa.</li>
        </ul>
        <LinkButton href="/onboarding/consents">Continua</LinkButton>
      </Card>
    );
  }

  const domainCo = await findCompanyByDomain(u.email);
  const invited = (await cookies()).get("wm_code")?.value ?? "";

  return (
    <div className="space-y-4">
      <h1>Come vuoi iniziare?</h1>
      <Sp sp={sp} />
      {domainCo && (
        <Card className="space-y-3 border-teal-100 bg-teal-50">
          <p className="text-sm">
            Abbiamo riconosciuto il dominio della tua email: <strong>{domainCo.name}</strong> offre un programma ai propri dipendenti.
          </p>
          <form action={redeemDomainAction}>
            <Button>Attiva il benefit di {domainCo.name}</Button>
          </form>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3">
          <h2>Per me</h2>
          <p className="text-sm text-ink-600">Prenoti e paghi in autonomia.</p>
          <form action={choosePathAction}>
            <input type="hidden" name="path" value="private" />
            <Button variant="secondary" className="w-full">Continua senza codice</Button>
          </form>
        </Card>
        <Card className="space-y-3">
          <h2>Ho un codice aziendale</h2>
          <form action={redeemCodeAction} className="space-y-2">
            <Field label="Codice">
              <input name="code" placeholder="Es. ACME2026" required defaultValue={invited} autoCapitalize="characters" />
            </Field>
            <Button className="w-full">Verifica il codice</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
