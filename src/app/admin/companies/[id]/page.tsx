import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { adminCreateCodeAction, adminRevokeCodeAction, inviteStaffAction, saveCompanyAction } from "@/app/actions/admin";
import { Badge, Button, Card, Field, PageHeader, Sp, Stat } from "@/components/ui";
import { accessCodes, companies, db, users } from "@/db";
import { PIPELINE_STAGES, SPECIALTIES } from "@/lib/constants";
import { requireStaff } from "@/lib/guard";
import { creditRegistry } from "@/server/kpi";

/** B-01 / B-02 / B-03 / B-05 / C-02 / C-04: tutto sull'azienda, con avvisi su crediti e scadenza. */
export default async function CompanyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireStaff("companies.manage");
  const [c] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!c) notFound();
  const codes = await db.select().from(accessCodes).where(eq(accessCodes.companyId, id)).orderBy(desc(accessCodes.createdAt));
  const hrs = await db.select().from(users).where(eq(users.companyId, id));
  const reg = await creditRegistry(id);
  const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  return (
    <>
      <PageHeader title={c.name} />
      <Sp sp={sp} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Attivati" value={reg.users ?? "< soglia"} hint={`su ${c.coveredEmployees} coperti`} /><Stat label="Crediti assegnati" value={reg.granted} />
        <Stat label="Consumati" value={reg.consumed} /><Stat label="Residui" value={reg.residual} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2>Contratto e regole</h2>
          <form action={saveCompanyAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={c.id} />
            <div className="sm:col-span-2"><Field label="Ragione sociale"><input name="name" defaultValue={c.name} required /></Field></div>
            <Field label="P.IVA"><input name="vatNumber" defaultValue={c.vatNumber ?? ""} /></Field><Field label="Codice SDI"><input name="sdiCode" defaultValue={c.sdiCode ?? ""} /></Field>
            <Field label="PEC"><input name="pec" defaultValue={c.pec ?? ""} /></Field><Field label="Referente account"><input name="accountOwner" defaultValue={c.accountOwner ?? ""} /></Field>
            <Field label="Dipendenti coperti"><input name="coveredEmployees" type="number" min={0} defaultValue={c.coveredEmployees} /></Field><Field label="Sedute incluse/dipendente"><input name="includedSessions" type="number" min={0} defaultValue={c.includedSessions} /></Field>
            <Field label="Sconto successive (%)"><input name="discountPct" type="number" min={0} max={100} defaultValue={c.discountPct} /></Field><Field label="Familiari/dipendente"><input name="familyMax" type="number" min={0} defaultValue={c.familyMax} /></Field>
            <Field label="Sconto familiari (%)"><input name="familyDiscountPct" type="number" min={0} max={100} defaultValue={c.familyDiscountPct} /></Field><Field label="Canone annuo (€)"><input name="annualFee" type="number" step="0.01" defaultValue={c.annualFeeCents / 100} /></Field>
            <Field label="Valore contratto (€)"><input name="contractValue" type="number" step="0.01" defaultValue={c.contractValueCents / 100} /></Field><Field label="Fase"><select name="pipelineStage" defaultValue={c.pipelineStage}>{PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Inizio"><input name="startsAt" type="date" defaultValue={date(c.startsAt)} /></Field><Field label="Scadenza"><input name="endsAt" type="date" defaultValue={date(c.endsAt)} /></Field>
            <Field label="Stato"><select name="status" defaultValue={c.status}><option value="active">Attivo</option><option value="suspended">Sospeso</option><option value="ended">Concluso</option></select></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Specialità coperte (nessuna = tutte)</legend><div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(SPECIALTIES).map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm font-normal"><input type="checkbox" name="coveredSpecialties" value={k} defaultChecked={c.coveredSpecialties.includes(k)} />{v}</label>)}</div></fieldset>
            <div className="sm:col-span-2"><Button>Salva</Button></div>
          </form>
        </Card>
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2>Codici</h2>
            <ul className="divide-y divide-ink-100 text-sm">{codes.map((k) => <li key={k.id} className="flex items-center justify-between py-1.5"><span><span className="font-mono">{k.code}</span> · {k.kind} · {k.usedCount}{k.maxUses ? `/${k.maxUses}` : ""} {k.revokedAt && <Badge tone="red">revocato</Badge>}</span>{!k.revokedAt && <form action={adminRevokeCodeAction}><input type="hidden" name="id" value={k.id} /><input type="hidden" name="companyId" value={c.id} /><button className="text-xs text-red-700 underline">Revoca</button></form>}</li>)}</ul>
            <form action={adminCreateCodeAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="companyId" value={c.id} /><Field label="Codice"><input name="code" placeholder="auto" /></Field><Field label="Scadenza"><input name="expiresAt" type="date" /></Field><Button variant="secondary">Crea</Button></form>
          </Card>
          <Card className="space-y-3">
            <h2>Referenti HR</h2>
            <ul className="text-sm">{hrs.filter((h) => h.role === "hr").map((h) => <li key={h.id}>{h.fullName} · {h.email}</li>)}</ul>
            <form action={inviteStaffAction} className="grid gap-2 sm:grid-cols-2"><input type="hidden" name="role" value="hr" /><input type="hidden" name="companyId" value={c.id} /><input type="hidden" name="back" value={`/admin/companies/${c.id}`} /><Field label="Nome"><input name="fullName" /></Field><Field label="Email"><input name="email" type="email" required /></Field><div className="sm:col-span-2"><Button variant="secondary">Invita referente HR</Button></div></form>
          </Card>
        </div>
      </div>
    </>
  );
}
