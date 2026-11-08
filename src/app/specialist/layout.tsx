import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function SpecialistLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser({ roles: ["specialist"] });
  return <Shell user={u} nav={navFor("specialist")}>{children}</Shell>;
}
