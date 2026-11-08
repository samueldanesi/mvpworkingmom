import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { nextOnboardingStep } from "@/server/onboarding";

/** Finché l'ingresso non è completo (scelta, consensi, questionario, check-in) si resta nel percorso. */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser({ roles: ["user"] });
  const step = await nextOnboardingStep(u.id);
  if (step) redirect(step);
  return <>{children}</>;
}
