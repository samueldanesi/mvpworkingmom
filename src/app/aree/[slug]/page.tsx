import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/Shell";
import { LinkButton } from "@/components/ui";
import { AREE } from "@/lib/aree";

export function generateStaticParams() {
  return AREE.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: AREE.find((a) => a.slug === slug)?.title ?? "Aree di supporto" };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = AREE.find((x) => x.slug === slug);
  if (!a) notFound();
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl space-y-5">
        <Link href="/aree" className="text-sm">← Tutte le aree di supporto</Link>
        <h1 className="text-4xl font-bold">{a.title}</h1>
        {a.lead && <p className="text-xl font-semibold text-night-800">{a.lead}</p>}
        {a.body.map((p) => <p key={p.slice(0, 24)} className="leading-relaxed text-ink-700">{p}</p>)}
        <div className="rounded-3xl bg-blush-100 p-6">
          <h2 className="text-xl font-bold">I nostri professionisti</h2>
          <p className="mt-2 text-sm text-ink-700">Dopo un breve questionario ti proponiamo gli specialisti più adatti a ciò che stai vivendo. Il primo colloquio di 20 minuti è gratuito.</p>
          <LinkButton href="/register" className="mt-4">Trova il tuo specialista</LinkButton>
        </div>
      </article>
    </PublicShell>
  );
}
