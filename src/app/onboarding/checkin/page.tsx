import { skipCheckinAction } from "@/app/actions/onboarding";
import { CheckinForm } from "@/components/CheckinForm";
import { Card } from "@/components/ui";

export const metadata = { title: "Check-in iniziale" };

export default function OnboardingCheckin() {
  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1>Il tuo punto di partenza</h1>
        <p className="text-sm text-ink-600">
          Poche domande per capire come stai oggi. Ci aiutano a ripeterle più avanti e vedere se il percorso ti fa bene. Puoi saltare questo passaggio.
        </p>
        <form action={skipCheckinAction}>
          <button className="text-sm underline">Salta per ora</button>
        </form>
      </Card>
      <CheckinForm moment="T0" next="/onboarding/checkin" />
    </div>
  );
}
