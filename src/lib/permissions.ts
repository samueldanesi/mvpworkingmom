import type { Role } from "@/db/schema";

/** C-08: permessi granulari per ruolo. Il responsabile clinico e l'admin non leggono mai chat e note. */
export const PERMISSIONS = {
  "companies.manage": "Gestire aziende, contratti e regole di copertura",
  "codes.manage": "Creare e revocare codici di accesso",
  "users.view": "Vedere anagrafiche utenti (accesso tracciato)",
  "finance.view": "Vedere incassi, commissioni, pagamenti e fatture",
  "payouts.run": "Generare e segnare pagamenti agli specialisti",
  "tickets.handle": "Gestire assistenza, rimborsi e contestazioni",
  "specialists.review": "Valutare candidature e profili degli specialisti",
  "clinical.reports": "Gestire segnalazioni e qualità clinica",
  "safety.clear": "Sbloccare utenti dopo un controllo di sicurezza",
  "audit.view": "Consultare il registro degli accessi",
  "gdpr.handle": "Gestire le richieste GDPR",
  "templates.edit": "Modificare modelli email e vedere il registro invii",
  "staff.manage": "Assegnare ruoli al personale",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL.filter((p) => !["clinical.reports", "safety.clear", "specialists.review"].includes(p)),
  clinical_lead: ["specialists.review", "clinical.reports", "safety.clear", "audit.view", "tickets.handle"],
  hr: [],
  specialist: [],
  user: [],
};

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "specialist":
      return "/specialist";
    case "hr":
      return "/hr";
    case "admin":
    case "clinical_lead":
      return "/admin";
    default:
      return "/app";
  }
}
