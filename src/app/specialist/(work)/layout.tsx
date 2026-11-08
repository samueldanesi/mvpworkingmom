import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { specialistState } from "@/server/specialistGate";

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser({ roles: ["specialist"] });
  const st = await specialistState(u.id);
  if (!st.ready) redirect("/specialist");
  return <>{children}</>;
}
