import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { careRelationships, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { AGE_GROUPS, LANGUAGES, SPECIALTIES } from "@/lib/constants";
import { eur, fmtDateTime } from "@/lib/format";
import { publicSpecialist } from "@/server/queries";

export default async function SpecialistProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser({ roles: ["user"] });
  const s = await publicSpecialist(id);
  if (!s) notFound();
  const [rel] = await db.select().from(careRelationships).where(and(eq(careRelationships.userId, u.id), eq(careRelationships.specialistId, id))).limit(1);
  const p = s.profile;
  return (
    <>
      <PageHeader title={s.name} subtitle={p.title ?? undefined} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-4 md:col-span-2">
          {p.photoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/specialist-photo/${s.id}?k=${p.photoUrl.slice(0, 8)}`} alt={s.name} className="h-28 w-28 rounded-full object-cover" />}
          <div className="flex flex-wrap gap-1.5">
            {p.specializations.map((x) => <Badge key={x} tone="brand">{SPECIALTIES[x] ?? x}</Badge>)}
            {p.languages.map((l) => <Badge key={l}>{LANGUAGES[l] ?? l}</Badge>)}
          </div>
          <div>
            <h3>Approccio</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{p.approach}</p>
          </div>
          {p.bio && (
            <div>
              <h3>Chi sono</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{p.bio}</p>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-500">Iscrizione all&apos;albo</dt><dd>{p.registryName} {p.registryNumber}</dd></div>
            <div><dt className="text-ink-500">Fasce d&apos;età seguite</dt><dd>{p.ageGroups.map((g) => AGE_GROUPS[g]).join(", ") || "—"}</dd></div>
            <div><dt className="text-ink-500">Orari di risposta in chat</dt><dd>{p.responseHours ?? "—"}</dd></div>
          </dl>
        </Card>
        <Card className="space-y-3">
          <p className="text-2xl font-semibold">{eur(p.priceCents)}</p>
          <p className="text-sm text-ink-500">per seduta di {p.sessionMinutes} minuti</p>
          <p className="text-xs text-ink-500">{s.nextSlot ? `Prossimo colloquio gratuito: ${fmtDateTime(s.nextSlot, u.timezone)}` : "Nessuna disponibilità a breve"}</p>
          {(!rel || rel.status === "changed") && <LinkButton href={`/app/book/${s.id}?kind=intro`} className="w-full">Colloquio gratuito (20 min)</LinkButton>}
          {rel?.status === "active" && <LinkButton href={`/app/book/${s.id}?kind=session`} className="w-full">Prenota una seduta</LinkButton>}
          {rel?.status === "intro_booked" && <LinkButton href="/app/appointments" variant="secondary" className="w-full">Vedi il tuo colloquio</LinkButton>}
          {rel?.status === "intro_done" && <LinkButton href="/app/appointments" variant="secondary" className="w-full">Decidi se proseguire</LinkButton>}
        </Card>
      </div>
    </>
  );
}
