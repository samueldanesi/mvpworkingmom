import { inArray } from "drizzle-orm";
import { changeRoleAction, inviteStaffAction, saveRulesAction } from "@/app/actions/admin";
import { Badge, Button, Card, Field, PageHeader, Sp } from "@/components/ui";
import { db, users } from "@/db";
import { requireStaff } from "@/lib/guard";
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { getRules } from "@/server/settings";

export const metadata = { title: "Regole e ruoli" };

/** C-08: ruoli con permessi granulari. D-05 / U-11 / S-09: regole di business configurabili. */
export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const me = await requireStaff("staff.manage");
  const rules = await getRules();
  const staff = await db.select().from(users).where(inArray(users.role, ["admin", "clinical_lead"]));
  const perms = Object.keys(PERMISSIONS) as Permission[];
  return (
    <>
      <PageHeader title="Regole e ruoli" />
      <Sp sp={sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2>Regole di business</h2>
          <form action={saveRulesAction} className="space-y-3">
            <Field label="Preavviso per disdetta/spostamento (ore)" hint="Oltre il preavviso la seduta resta a pagamento. Proposta di partenza: 24."><input name="cancelNoticeHours" type="number" min={0} max={168} defaultValue={rules.cancelNoticeHours} /></Field>
            <Field label="Commissione di piattaforma (%)" hint="Trattenuta sulle consulenze; il resto spetta allo specialista."><input name="platformFeePct" type="number" min={0} max={60} defaultValue={rules.platformFeePct} /></Field>
            <Field label="Soglia minima di aggregazione N" hint="Nessun dato per gruppi sotto N persone (proposta: 10)."><input name="kMin" type="number" min={5} max={100} defaultValue={rules.kMin} /></Field>
            <Button>Salva</Button>
          </form>
        </Card>
        <Card className="space-y-3">
          <h2>Personale</h2>
          <ul className="divide-y divide-ink-100 text-sm">{staff.map((s) => <li key={s.id} className="flex items-center justify-between py-2"><span>{s.fullName ?? s.email} <Badge>{s.role}</Badge></span>{s.id !== me.id && <form action={changeRoleAction} className="flex gap-1"><input type="hidden" name="id" value={s.id} /><select name="role" defaultValue={s.role} className="!w-auto"><option value="admin">admin</option><option value="clinical_lead">clinical_lead</option><option value="user">rimuovi (user)</option></select><Button variant="secondary">Cambia</Button></form>}</li>)}</ul>
          <form action={inviteStaffAction} className="grid gap-2 sm:grid-cols-3"><input type="hidden" name="back" value="/admin/settings" /><Field label="Nome"><input name="fullName" /></Field><Field label="Email"><input name="email" type="email" required /></Field><Field label="Ruolo"><select name="role"><option value="admin">Admin</option><option value="clinical_lead">Responsabile clinico</option></select></Field><div className="sm:col-span-3"><Button variant="secondary">Invita</Button></div></form>
          <p className="text-xs text-ink-500">Il 2FA è obbligatorio per tutto il personale.</p>
        </Card>
      </div>
      <Card className="mt-6 overflow-x-auto p-0">
        <h2 className="p-5 pb-0">Matrice permessi</h2>
        <table><thead><tr><th>Permesso</th><th>Admin</th><th>Resp. clinico</th></tr></thead><tbody>{perms.map((p) => <tr key={p}><td>{PERMISSIONS[p]}</td><td>{ROLE_PERMISSIONS.admin.includes(p) ? "✓" : "—"}</td><td>{ROLE_PERMISSIONS.clinical_lead.includes(p) ? "✓" : "—"}</td></tr>)}</tbody></table>
        <p className="p-5 pt-2 text-xs text-ink-500">Nessun ruolo del backoffice ha accesso a chat, note di seduta o risposte del questionario.</p>
      </Card>
    </>
  );
}
