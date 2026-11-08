"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
      <p className="text-sm text-ink-600">Riprova tra un momento. Se il problema continua, contatta l&apos;assistenza.</p>
      <button onClick={reset} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Riprova</button>
    </div>
  );
}
