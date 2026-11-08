import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { can, type Permission } from "./permissions";

/** C-08: ogni pagina e azione del backoffice controlla il permesso specifico, non solo il ruolo. */
export async function requireStaff(perm?: Permission) {
  const u = await requireUser({ roles: ["admin", "clinical_lead"] });
  if (perm && !can(u.role, perm)) redirect("/admin?error=" + encodeURIComponent("Non hai il permesso per questa sezione."));
  return u;
}
