import type { Role } from "@/db/schema";
import type { NavItem } from "@/components/Shell";
import { can, type Permission } from "./permissions";

const ADMIN_NAV: { href: string; label: string; perm?: Permission }[] = [
  { href: "/admin", label: "Panoramica" },
  { href: "/admin/companies", label: "Aziende", perm: "companies.manage" },
  { href: "/admin/users", label: "Utenti", perm: "users.view" },
  { href: "/admin/specialists", label: "Specialisti", perm: "specialists.review" },
  { href: "/admin/support", label: "Assistenza", perm: "tickets.handle" },
  { href: "/admin/finance", label: "Finanza", perm: "finance.view" },
  { href: "/admin/clinical", label: "Qualità clinica", perm: "clinical.reports" },
  { href: "/admin/gdpr", label: "GDPR", perm: "gdpr.handle" },
  { href: "/admin/audit", label: "Accessi", perm: "audit.view" },
  { href: "/admin/emails", label: "Email", perm: "templates.edit" },
  { href: "/admin/settings", label: "Regole e ruoli", perm: "staff.manage" },
];

export function navFor(role: Role): NavItem[] {
  switch (role) {
    case "user":
      return [
        { href: "/app", label: "Home" },
        { href: "/app/matching", label: "Specialisti" },
        { href: "/app/appointments", label: "Appuntamenti" },
        { href: "/app/chat", label: "Chat" },
        { href: "/app/checkin", label: "Check-in" },
        { href: "/app/invoices", label: "Fatture" },
        { href: "/app/support", label: "Assistenza" },
        { href: "/app/settings", label: "Impostazioni" },
      ];
    case "specialist":
      return [
        { href: "/specialist", label: "Panoramica" },
        { href: "/specialist/agenda", label: "Agenda" },
        { href: "/specialist/clients", label: "Utenti" },
        { href: "/specialist/chat", label: "Chat" },
        { href: "/specialist/earnings", label: "Compensi" },
        { href: "/specialist/profile", label: "Profilo" },
        { href: "/specialist/ratings", label: "Valutazioni" },
        { href: "/specialist/reports", label: "Segnalazioni" },
        { href: "/specialist/support", label: "Assistenza" },
      ];
    case "hr":
      return [
        { href: "/hr", label: "Dashboard" },
        { href: "/hr/program", label: "Programma" },
        { href: "/hr/codes", label: "Codici" },
        { href: "/hr/credits", label: "Crediti" },
        { href: "/hr/reports", label: "Report" },
        { href: "/hr/launch", label: "Lancio" },
      ];
    case "admin":
    case "clinical_lead":
      return ADMIN_NAV.filter((i) => !i.perm || can(role, i.perm)).map(({ href, label }) => ({ href, label }));
  }
}
