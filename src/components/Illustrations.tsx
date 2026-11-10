/** Illustrazioni vettoriali semplici (nessuna foto reale: l'MVP usa segnaposto). */
const SKINS = ["#f3c9a8", "#e0a982", "#c98b66", "#f5d6bf"];
const HAIRS = ["#2b2230", "#6b3f2a", "#c9a36b", "#1c1830"];
const BGS = ["#e8e6f2", "#fde8e4", "#e3f1ee", "#f4ece0"];
const CLOTHES = ["#4b6a8a", "#d63f36", "#2a9d8f", "#7a5c9e"];

export function Portrait({ i = 0, className }: { i?: number; className?: string }) {
  const k = i % 4;
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label="Specialista">
      <rect width="120" height="150" rx="10" fill={BGS[k]} />
      <path d={`M10 150c0-34 22-52 50-52s50 18 50 52z`} fill={CLOTHES[k]} />
      <rect x="50" y="78" width="20" height="24" rx="8" fill={SKINS[k]} />
      <ellipse cx="60" cy="58" rx="24" ry="28" fill={SKINS[k]} />
      <path d={k % 2 ? "M34 56c0-24 12-34 26-34s26 10 26 34c-6-10-14-14-26-14s-20 4-26 14z" : "M35 52c2-22 14-30 25-30s23 8 25 30c-6-8-14-11-25-11s-19 3-25 11z"} fill={HAIRS[k]} />
      <circle cx="51" cy="60" r="2" fill="#2b2230" /><circle cx="69" cy="60" r="2" fill="#2b2230" />
      <path d="M52 72q8 6 16 0" stroke="#2b2230" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function StepIcon({ n }: { n: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 80 64" className="h-16 w-20" aria-hidden fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {n === 1 && (<><rect x="10" y="12" width="60" height="38" rx="6" className="stroke-ink-700" /><path d="M24 24h32M24 32h22M24 40h14" className="stroke-brand-500" /><path d="M4 56h72" className="stroke-ink-700" /></>)}
      {n === 2 && (<><rect x="24" y="4" width="32" height="56" rx="8" className="stroke-ink-700" /><circle cx="40" cy="26" r="8" className="stroke-brand-500" /><path d="M30 46h20" className="stroke-ink-700" /></>)}
      {n === 3 && (<><rect x="10" y="10" width="60" height="44" rx="6" className="stroke-ink-700" /><path d="M10 22h60" className="stroke-ink-700" /><path d="M24 36l6 6 12-12" className="stroke-brand-500" /></>)}
    </svg>
  );
}

/** Telefono con l'app: elenco appuntamenti, in stile mockup. */
export function PhoneMockup({ className, couple }: { className?: string; couple?: boolean }) {
  const title = couple ? <>Percorso<br />di coppia</> : <>Percorso<br />genitorialità</>;
  const who = couple ? ["Marco", "Psicologo di coppia"] : ["Laura", "Psicologa perinatale"];
  const price = couple ? "59 €" : "49 €";
  return (
    <div className={`relative mx-auto w-[260px] ${className ?? ""}`}>
      <svg viewBox="0 0 300 330" className="absolute -left-10 top-10 -z-0 h-[420px] w-[360px]" aria-hidden>
        <path d="M60 40c60-50 190-30 220 40 25 60-10 140-70 190S70 330 30 260C-10 190 0 90 60 40z" className="fill-brand-500/90" />
      </svg>
      <div className="relative z-10 rotate-[6deg] rounded-[36px] border-[6px] border-night-900 bg-white p-3 shadow-2xl">
        <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-night-900" />
        <p className="px-1 text-lg font-bold leading-tight text-ink-900">{title}</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-blush-100 p-2">
          <Portrait i={couple ? 0 : 1} className="h-10 w-9 rounded-lg" />
          <div><p className="text-xs font-semibold text-ink-900">{who[0]}</p><p className="text-[10px] text-ink-500">{who[1]}</p></div>
        </div>
        <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">Prossimi appuntamenti</p>
        {[["martedì", "3 febbraio", "10:00 - 10:50", "0 €"], ["giovedì", "19 marzo", "14:00 - 14:50", price]].map(([d, n, t, p]) => (
          <div key={n} className="mt-2 flex items-center justify-between rounded-2xl border border-ink-100 border-l-4 border-l-brand-500 bg-white p-2 shadow-sm">
            <div><p className="text-[10px] text-ink-500">{d}</p><p className="text-sm font-bold text-ink-900">{n}</p><p className="text-[10px] text-ink-500">{t}</p></div>
            <span className="text-sm font-semibold text-ink-900">{p}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-around border-t border-ink-100 pt-2 text-[9px] text-ink-500"><span>Home</span><span>Chat</span><span>Diario</span><span>Fatture</span></div>
      </div>
    </div>
  );
}
