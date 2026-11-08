import { submitProfileAction } from "@/app/actions/specialist";
import { Badge, Button, Card, Field, Notice, PageHeader, Sp } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { AGE_GROUPS, LANGUAGES, SPECIALTIES } from "@/lib/constants";
import { getProfile } from "@/server/specialist";

export const metadata = { title: "Profilo pubblico" };

type Pending = Partial<{ title: string; bio: string; approach: string; specializations: string[]; languages: string[]; gender: string | null; ageGroups: string[]; responseHours: string; sessionMinutes: number; priceCents: number; weeklyCapacity: number }>;

/** S-03: ogni modifica passa da approvazione prima di essere pubblicata. */
export default async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["specialist"] });
  const base = (await getProfile(u.id))!;
  const p = { ...base, ...((base.pendingChanges as Pending | null) ?? {}) };
  return (
    <>
      <PageHeader title="Profilo pubblico" actions={base.pendingChanges ? <Badge tone="amber">Modifiche in approvazione</Badge> : <Badge tone="green">Pubblicato</Badge>} />
      <Sp sp={sp} />
      <Notice tone="blue">Le modifiche vengono pubblicate solo dopo l&apos;approvazione del responsabile clinico.</Notice>
      <form action={submitProfileAction} className="mt-4 space-y-4">
        <Card className="space-y-4">
          <Field label="Titolo"><input name="title" defaultValue={p.title ?? ""} required /></Field>
          <Field label="Approccio" hint="Come lavori, in poche righe."><textarea name="approach" rows={4} defaultValue={p.approach ?? ""} required /></Field>
          <Field label="Chi sono"><textarea name="bio" rows={4} defaultValue={p.bio ?? ""} /></Field>
          <fieldset className="space-y-1.5"><legend className="text-sm font-medium">Specializzazioni</legend><div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(SPECIALTIES).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="specializations" value={k} defaultChecked={p.specializations.includes(k)} />{v}</label>)}</div></fieldset>
          <fieldset className="space-y-1.5"><legend className="text-sm font-medium">Lingue</legend><div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(LANGUAGES).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="languages" value={k} defaultChecked={p.languages.includes(k)} />{v}</label>)}</div></fieldset>
          <fieldset className="space-y-1.5"><legend className="text-sm font-medium">Fasce d&apos;età dei figli che segui</legend><div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(AGE_GROUPS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="ageGroups" value={k} defaultChecked={p.ageGroups.includes(k)} />{v}</label>)}</div></fieldset>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Genere"><select name="gender" defaultValue={p.gender ?? ""}><option value="">—</option><option value="f">Donna</option><option value="m">Uomo</option></select></Field>
            <Field label="Durata seduta (min)"><input name="sessionMinutes" type="number" min={30} max={90} defaultValue={p.sessionMinutes} /></Field>
            <Field label="Tariffa per seduta (€)"><input name="price" type="number" min={10} max={300} step="1" defaultValue={p.priceCents / 100} /></Field>
            <Field label="Capacità settimanale (sedute)"><input name="weeklyCapacity" type="number" min={1} max={60} defaultValue={p.weeklyCapacity} /></Field>
            <div className="sm:col-span-2"><Field label="Orari di risposta in chat"><input name="responseHours" defaultValue={p.responseHours ?? ""} placeholder="Es. lun-ven entro 24 ore" /></Field></div>
          </div>
          <Button>Invia per approvazione</Button>
        </Card>
      </form>
    </>
  );
}
