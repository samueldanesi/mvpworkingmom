import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser({ roles: ["user"] });
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo href="/app" />
          <a href="/emergency" className="text-xs text-ink-500">Emergenza</a>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
void redirect;
