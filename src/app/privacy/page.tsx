import Link from "next/link";
import { LegalBlocks } from "@/components/Legal";
import { PublicShell } from "@/components/Shell";
import { PRIVACY } from "@/lib/legal";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1>{PRIVACY.title}</h1>
        <LegalBlocks blocks={PRIVACY.blocks} />
        <p className="text-sm text-ink-600">Il sito utilizza cookie e marcatori: per i dettagli consulta la <Link href="/cookie">cookie policy</Link>.</p>
      </div>
    </PublicShell>
  );
}
