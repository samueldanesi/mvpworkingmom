import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { bookIntroAction, bookSessionsAction } from "@/app/actions/booking";
import { SlotPicker } from "@/components/SlotPicker";
import { Button, Card, Field, Notice, PageHeader, Sp, str } from "@/components/ui";
import { careRelationships, companies, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { eur } from "@/lib/format";
import { creditBalance } from "@/server/codes";
import { publicSpecialist } from "@/server/queries";
import { getRules } from "@/server/settings";
import { loadSlots } from "@/server/slotsDb";

export default async function Book({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const kind = str(sp.kind) === "session" ? "session" : "intro";
  const u = await requireUser({ roles: ["user"] });
  const s = await publicSpecialist(id);
  if (!s) notFound();
  const [rel] = await db.select().from(careRelationships).where(and(eq(careRelationships.userId, u.id), eq(careRelationships.specialistId, id))).limit(1);
  if (kind === "session" && rel?.status !== "active") redirect(`/app/specialists/${id}`);

  const slots = await loadSlots(id, kind, { days: kind === "intro" ? 21 : 28 });
  const rules = await getRules();

  let priceLine = "";
  if (kind === "session") {
    const credits = await creditBalance(u.id);
    const [co] = u.companyId ? await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
    const covered = !co || co.coveredSpecialties.length === 0 || s.profile.specializations.some((x) => co.coveredSpecialties.includes(x));
    if (credits > 0 && u.coverageKind === "employee" && covered) priceLine = `Hai ${credits} sedute incluse nel programma: verranno usate per prime, poi pagherai in autonomia.`;
    else {
      const disc = co ? (u.coverageKind === "employee" ? co.discountPct : co.familyDiscountPct) : 0;
      const price = Math.round((s.profile.priceCents * (100 - disc)) / 100);
      priceLine = `Costo per seduta: ${eur(price)}${disc ? ` (sconto ${disc}% del tuo programma)` : ""}. Pagherai subito dopo la scelta.`;
    }
  }

  return (
    <>
      <PageHeader title={kind === "intro" ? `Colloquio gratuito con ${s.name}` : `Prenota una seduta con ${s.name}`} subtitle={kind === "intro" ? "20 minuti in videochiamata, gratuito e senza impegno." : `${s.profile.sessionMinutes} minuti in videochiamata.`} />
      <Sp sp={sp} />
      <form action={kind === "intro" ? bookIntroAction : bookSessionsAction} className="space-y-5">
        <input type="hidden" name="specialistId" value={id} />
        <Card className="space-y-4">
          <SlotPicker slots={slots} tz={u.timezone} />
        </Card>
        {kind === "session" && (
          <Card className="space-y-3">
            <Field label="Ripetizione" hint="La stessa ora, ogni settimana. Ogni seduta è confermata e pagata singolarmente.">
              <select name="weeks" defaultValue="1">
                <option value="1">Solo questa seduta</option>
                {[2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>Ogni settimana per {n} settimane</option>)}
              </select>
            </Field>
            <Notice tone="blue">{priceLine}</Notice>
            <p className="text-xs text-ink-500">
              Puoi spostare o disdire gratuitamente fino a {rules.cancelNoticeHours} ore prima; oltre il preavviso la seduta resta a pagamento. In caso di pagamento non riuscito lo slot non viene confermato.
            </p>
          </Card>
        )}
        {slots.length > 0 && <Button>{kind === "intro" ? "Prenota il colloquio" : "Continua"}</Button>}
        <p className="text-xs text-ink-500">La chat con lo specialista non è un canale di emergenza. In caso di pericolo chiama il 112. {env.introMinutes && null}</p>
      </form>
    </>
  );
}
