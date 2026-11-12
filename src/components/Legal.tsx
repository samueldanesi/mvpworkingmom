import type { Block } from "@/lib/legal";

/** Rende i testi legali (titoli, paragrafi, elenchi, definizioni). */
export function LegalBlocks({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (list.length) out.push(<ul key={`u${k}`} className="list-disc space-y-1 pl-5 text-sm text-ink-700">{list.map((x) => <li key={x}>{x}</li>)}</ul>);
    list = [];
  };
  blocks.forEach((b, i) => {
    if (b.t === "li") { list.push(b.x); return; }
    flush(i);
    if (b.t === "h") out.push(<h2 key={i} className="pt-4 text-xl font-semibold">{b.x}</h2>);
    else if (b.t === "d") out.push(<h3 key={i} className="pt-2">{b.x}</h3>);
    else out.push(<p key={i} className="text-sm leading-relaxed text-ink-700">{b.x}</p>);
  });
  flush(blocks.length);
  return <div className="space-y-3">{out}</div>;
}
