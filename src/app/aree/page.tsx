import Link from "next/link";
import { PublicShell } from "@/components/Shell";
import { Card, LinkButton } from "@/components/ui";
import { AREE, FIGURE_PROFESSIONALI } from "@/lib/aree";

export const metadata = { title: "Aree di supporto" };

export default function AreePage() {
  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="max-w-3xl space-y-3">
          <h1 className="text-4xl font-bold">Working Mom può aiutarti a gestire ogni fase della genitorialità</h1>
          <h2 className="text-xl font-semibold">Aree di supporto</h2>
          <p className="text-ink-700">Il confronto con uno specialista qualificato può essere lo strumento giusto per affrontare i piccoli e grandi dubbi che segnano la vita di ogni giorno con i figli.</p>
          <p className="text-ink-700">I professionisti che collaborano con Working Mom possono accompagnarti su diversi temi, alcuni dei quali elencati di seguito, e su molti altri.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREE.map((a) => (
            <Link key={a.slug} href={`/aree/${a.slug}`} className="no-underline hover:no-underline">
              <Card className="h-full transition hover:border-brand-300 hover:shadow-md"><h3 className="text-lg font-bold text-night-900">{a.title}</h3><p className="mt-2 text-sm font-semibold text-brand-600">Scopri di più →</p></Card>
            </Link>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">I professionisti con cui lavoriamo</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FIGURE_PROFESSIONALI.map((g) => (
              <Card key={g.title} className="space-y-2">
                <h3 className="font-bold text-night-900">{g.title}</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{g.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </Card>
            ))}
          </div>
        </section>
        <LinkButton href="/register">Trova il tuo specialista</LinkButton>
      </div>
    </PublicShell>
  );
}
