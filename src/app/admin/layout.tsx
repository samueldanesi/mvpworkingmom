import { Shell } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser({ roles: ["admin", "clinical_lead"] });
  return <Shell user={u} nav={navFor(u.role)} wide>{children}</Shell>;
}
