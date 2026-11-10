import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_2px_16px_rgba(28,24,48,0.06)]", className)}>{children}</div>;
}

const btn = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "border border-ink-200 bg-white text-ink-800 hover:bg-blush-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-ink-700 hover:bg-ink-50",
};
const btnBase = "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition no-underline hover:no-underline disabled:opacity-50";

export function Button({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btn }) {
  return <button {...p} className={clsx(btnBase, btn[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: keyof typeof btn; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={clsx(btnBase, btn[variant], variant === "primary" && "!text-white", className)}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "red" | "amber" | "blue" | "brand" }) {
  const tones = {
    gray: "bg-ink-100 text-ink-700",
    green: "bg-teal-100 text-teal-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-sky-100 text-sky-800",
    brand: "bg-brand-100 text-brand-800",
  };
  return <span className={clsx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={clsx("mb-4 rounded-lg border px-4 py-3 text-sm", error ? "border-red-200 bg-red-50 text-red-800" : "border-teal-100 bg-teal-50 text-teal-700")}
    >
      {error ?? ok}
    </div>
  );
}

export function Notice({ tone = "amber", children }: { tone?: "amber" | "blue" | "red"; children: ReactNode }) {
  const t = { amber: "border-amber-200 bg-amber-50 text-amber-900", blue: "border-sky-200 bg-sky-50 text-sky-900", red: "border-red-200 bg-red-50 text-red-900" };
  return <div className={clsx("rounded-lg border px-4 py-3 text-sm", t[tone])}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">{children}</p>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}

/** Logo ufficiale (orizzontale). `light` = versione bianca per sfondi scuri. */
export function Logo({ href = "/", light = false, className = "h-10" }: { href?: string; light?: boolean; className?: string }) {
  return (
    <Link href={href} className="flex items-center no-underline hover:no-underline" aria-label="Working Mom">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light ? "/brand/logo-orizzontale-bianco.svg" : "/brand/logo-orizzontale.svg"} alt="Working Mom" className={`${className} w-auto`} />
    </Link>
  );
}

export const Sp = (p: { sp: Record<string, string | string[] | undefined> }) => <Flash error={str(p.sp.error)} ok={str(p.sp.ok)} />;
export function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Pittogramma ufficiale (esagono). */
export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/pittogramma.svg" alt="" aria-hidden className={className} />;
}
