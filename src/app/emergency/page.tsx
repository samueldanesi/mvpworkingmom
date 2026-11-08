import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { Card, Notice } from "@/components/ui";
import { EMERGENCY_NUMBERS } from "@/lib/constants";

export const metadata = { title: "Numeri di emergenza" };

/** U-05 / P-10: sempre raggiungibile, anche senza accesso. */
export default function EmergencyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl space-y-4">
        <Notice tone="red">
          <strong>Se tu o qualcun altro siete in pericolo, chiama subito il 112.</strong> Working Mom non è un servizio di emergenza e le risposte che hai dato indicano che un
          intervento urgente potrebbe servire più di una consulenza online.
        </Notice>
        <Card className="space-y-3">
          <h1>Numeri utili, sempre attivi</h1>
          <ul className="divide-y divide-ink-100">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.number} className="flex items-center justify-between py-3">
                <span>{n.label}</span>
                <a href={`tel:${n.number.replace(/\s/g, "")}`} className="text-lg font-semibold">
                  {n.number}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-600">
            Per ora la prenotazione è sospesa. Se vuoi parlarne con il nostro team puoi <Link href="/app/support">scriverci</Link>: valuteremo insieme come proseguire.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
