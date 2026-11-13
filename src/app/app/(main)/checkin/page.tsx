import { CheckinForm } from "@/components/CheckinForm";
import { Card, Empty, PageHeader, Sp, str } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dueCheckins, type Moment } from "@/server/checkin";

export const metadata = { title: "Check-in di benessere" };

const LABEL = { T0: "Check-in iniziale", T1: "Dopo la quarta seduta", T2: "A fine percorso" };

export default async function Checkin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const u = await requireUser({ roles: ["user"] });
  const due = await dueCheckins(u.id);
  const wanted = str(sp.moment) as Moment | undefined;
  const moment = wanted && due.includes(wanted) ? wanted : due[0];
  return (
    <>
      <PageHeader title="Check-in di benessere" subtitle="Poche domande, ogni tanto, per capire come stai andando." />
      <Sp sp={sp} />
      {!moment ? (
        <Empty>Nessun check-in da compilare per ora. Ti avviseremo quando sarà il momento.</Empty>
      ) : (
        <div className="space-y-4">
          <Card><p className="text-sm text-ink-600">{LABEL[moment]}</p></Card>
          <CheckinForm moment={moment} next="/app/checkin" company={!!u.companyId} />
        </div>
      )}
    </>
  );
}
