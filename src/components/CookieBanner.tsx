"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Prefs = { funzionalita: boolean; esperienza: boolean; misurazione: boolean; marketing: boolean };
const NONE: Prefs = { funzionalita: false, esperienza: false, misurazione: false, marketing: false };
const ALL: Prefs = { funzionalita: true, esperienza: true, misurazione: true, marketing: true };
const KEY = "wm_consent";
const OPEN = "wm-open-cookie-prefs";

const CATS: [keyof Prefs, string, string][] = [
  ["funzionalita", "Funzionalità", "Abilitano semplici interazioni e funzionalità che ti permettono di accedere a determinate risorse del nostro servizio e ti consentono di comunicare più facilmente con noi."],
  ["esperienza", "Esperienza", "Ci permettono di migliorare la qualità della tua esperienza utente e consentono le interazioni con piattaforme, reti e contenuti esterni."],
  ["misurazione", "Misurazione", "Ci permettono di misurare il traffico e analizzare il tuo comportamento per migliorare il nostro servizio."],
  ["marketing", "Marketing", "Ci permettono di fornirti contenuti marketing o annunci personalizzati e di misurarne la performance."],
];

function save(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(p))}; path=/; max-age=${3600 * 24 * 365}; samesite=lax`;
  } catch {}
}

/** Banner di consenso cookie (testi forniti dalla Committente). Il sito usa solo cookie tecnici: le altre categorie sono previste ma non attive. */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [panel, setPanel] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(NONE);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setPrefs({ ...NONE, ...JSON.parse(v) });
      else setShow(true);
    } catch { setShow(true); }
    const open = () => { setPanel(true); setShow(true); };
    window.addEventListener(OPEN, open);
    return () => window.removeEventListener(OPEN, open);
  }, []);

  const done = (p: Prefs) => { save(p); setPrefs(p); setShow(false); setPanel(false); };
  if (!show) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Preferenze sulla privacy">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {!panel ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Informativa</h2>
            <p className="text-sm text-ink-700">Come specificato nella <Link href="/cookie">cookie policy</Link> utilizziamo cookie o tecnologie simili per finalità tecniche e, con il tuo consenso, anche per le finalità di funzionalità, esperienza, misurazione e marketing. Inoltre, terze parti selezionate, a fronte del tuo consenso, possono utilizzare le medesime tecnologie per proporti annunci personalizzati.</p>
            <p className="text-sm text-ink-700">Puoi liberamente prestare, rifiutare o revocare il tuo consenso, in qualsiasi momento, accedendo al pannello delle preferenze. Il rifiuto del consenso può rendere non disponibili le relative funzioni.</p>
            <p className="text-sm text-ink-700">Usa il pulsante «Accetta» per acconsentire. Chiudi questa informativa per continuare senza accettare.</p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => done(ALL)} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Accetta</button>
              <button onClick={() => setPanel(true)} className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">Scopri di più e personalizza</button>
              <button onClick={() => done(NONE)} className="px-2 text-sm font-medium text-ink-600 underline">Chiudi e continua senza accettare</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Le tue preferenze relative alla privacy</h2>
            <p className="text-sm text-ink-700">Questo pannello ti permette di esprimere alcune preferenze relative al trattamento delle tue informazioni personali. Puoi rivedere e modificare le tue scelte in qualsiasi momento accedendo al presente pannello tramite l&apos;apposito link.</p>
            <p className="text-sm text-ink-700">Per rifiutare il tuo consenso alle attività di trattamento descritte di seguito, disattiva i singoli comandi o utilizza il pulsante «Rifiuta tutto» e conferma di voler salvare le scelte effettuate.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => done(NONE)} className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold hover:bg-ink-50">Rifiuta tutto</button>
              <button onClick={() => done(ALL)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Accetta tutto</button>
            </div>
            <h3 className="pt-2">Le tue preferenze relative al consenso per le tecnologie di tracciamento</h3>
            <p className="text-sm text-ink-700">Le opzioni disponibili in questa sezione ti permettono di personalizzare le preferenze relative al consenso per qualsiasi tecnologia di tracciamento utilizzata per le finalità descritte di seguito. Per ulteriori informazioni fai riferimento alla <Link href="/cookie">cookie policy</Link>. Tieni presente che il rifiuto del consenso per una finalità particolare può rendere le relative funzioni non disponibili.</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between"><strong className="text-sm">Necessari</strong><span className="text-xs text-ink-500">Sempre attivi</span></div>
                <p className="mt-1 text-xs text-ink-600">Questi strumenti di tracciamento sono strettamente necessari per garantire il funzionamento e la fornitura del servizio che ci hai richiesto e, pertanto, non richiedono il tuo consenso.</p>
              </div>
              {CATS.map(([k, t, d]) => (
                <div key={k} className="rounded-xl border border-ink-100 p-3">
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                    {t}
                    <input type="checkbox" checked={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })} className="!w-auto" />
                  </label>
                  <p className="mt-1 text-xs text-ink-600">{d}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => done(prefs)} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Salva le scelte</button>
              <button onClick={() => setPanel(false)} className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-semibold hover:bg-ink-50">Indietro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Link che riapre il pannello delle preferenze. */
export function CookiePrefsLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return <button type="button" className={className ?? "text-brand-600 underline"} onClick={() => window.dispatchEvent(new Event(OPEN))}>{children}</button>;
}
