import Link from "next/link";
import { eq } from "drizzle-orm";
import { SpecialistCard } from "@/components/SpecialistCard";
import { Empty, Notice, PageHeader, Sp } from "@/components/ui";
import { SITUATIONS, situationSpecialties } from "@/lib/constants";
import { careRelationships, companies, db } from "@/db";
import { requireUser } from "@/lib/auth";
import { rank, type Candidate } from "@/lib/matching";
import { getIntake } from "@/server/intake";
import { bookableSpecialists } from "@/server/queries";

export const metadata = { title: "I tuoi specialisti" };

/** U-06: propone 2-3 specialisti in base alle regole configurabili; in alternativa elenco con filtri. */
export default async function Matching({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const intake = await getIntake(u.id);
  const [co] = u.companyId ? await db.select().from(companies).where(eq(companies.id, u.companyId)).limit(1) : [];
  const rels = await db.select().from(careRelationships).where(eq(careRelationships.userId, u.id));
  const excluded = new Set(rels.filter((r) => r.status === "changed").map((r) => r.specialistId));

  const all = await bookableSpecialists();
  const cands: Candidate[] = all
    .filter((s) => !excluded.has(s.id))
    .map((s) => ({
      userId: s.id,
      specializations: s.profile.specializations,
      languages: s.profile.languages,
      gender: s.profile.gender,
      ageGroups: s.profile.ageGroups,
      nextSlot: s.nextSlot,
      weeklyCapacityLeft: s.profile.weeklyCapacity,
    }));
  const ranked = rank(cands, {
    area: intake.data.area ?? "altro",
    wantedSpecialties: situationSpecialties(intake.data.situations ?? []),
    language: intake.data.language ?? "it",
    gender: intake.data.gender ?? "any",
    childAgeGroups: intake.data.childAgeGroups ?? [],
    coveredSpecialties: co?.coveredSpecialties ?? [],
  });
  const top = ranked.slice(0, 3);
  const byId = new Map(all.map((s) => [s.id, s]));

  return (
    <>
      <PageHeader title="I tuoi specialisti" subtitle="Le proposte più adatte, in base alle tue risposte." />
      <Sp sp={sp} />
      {SITUATIONS.filter((x) => x.note && intake.data.situations?.includes(x.id)).map((x) => <div key={x.id} className="mb-4"><Notice tone="blue">{x.note}</Notice></div>)}
      {top.length === 0 ? (
        <Empty>Al momento non ci sono specialisti disponibili. Riprova tra poco o scrivi all&apos;assistenza.</Empty>
      ) : (
        <div className="space-y-4">
          {top.map((m, i) => (
            <SpecialistCard key={m.candidate.userId} s={byId.get(m.candidate.userId)!} tz={u.timezone} reasons={m.reasons} highlight={i === 0} rel={rels.find((r) => r.specialistId === m.candidate.userId)?.status} />
          ))}
        </div>
      )}
      <p className="mt-6 text-sm">
        Preferisci scegliere da solo? <Link href="/app/specialists">Vedi tutti gli specialisti con i filtri</Link>.
      </p>
    </>
  );
}
