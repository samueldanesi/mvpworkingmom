import { SpecialistCard } from "@/components/SpecialistCard";
import { Button, Card, Empty, Field, PageHeader, str } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { LANGUAGES, SPECIALTIES } from "@/lib/constants";
import { bookableSpecialists } from "@/server/queries";

export const metadata = { title: "Tutti gli specialisti" };

export default async function AllSpecialists({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const spec = str(sp.specialty);
  const lang = str(sp.language);
  const gender = str(sp.gender);
  const list = (await bookableSpecialists()).filter(
    (s) => (!spec || s.profile.specializations.includes(spec)) && (!lang || s.profile.languages.includes(lang)) && (!gender || s.profile.gender === gender),
  );
  return (
    <>
      <PageHeader title="Tutti gli specialisti" />
      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Field label="Specialità">
            <select name="specialty" defaultValue={spec ?? ""}>
              <option value="">Tutte</option>
              {Object.entries(SPECIALTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Lingua">
            <select name="language" defaultValue={lang ?? ""}>
              <option value="">Tutte</option>
              {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Genere">
            <select name="gender" defaultValue={gender ?? ""}>
              <option value="">Indifferente</option>
              <option value="f">Donna</option>
              <option value="m">Uomo</option>
            </select>
          </Field>
          <div className="flex items-end"><Button variant="secondary">Filtra</Button></div>
        </form>
      </Card>
      {list.length === 0 ? <Empty>Nessuno specialista con questi filtri.</Empty> : <div className="space-y-4">{list.map((s) => <SpecialistCard key={s.id} s={s} tz={u.timezone} />)}</div>}
    </>
  );
}
