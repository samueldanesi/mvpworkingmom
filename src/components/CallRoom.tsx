"use client";
import { useEffect, useRef, useState } from "react";

/**
 * U-09: sala d'attesa con test audio e video, poi ingresso. Funziona nel browser senza installazioni.
 * Con VIDEO_PROVIDER=whereby l'ingresso apre la stanza del fornitore (server UE); in modalità mock
 * mostra una stanza simulata.
 */
export function CallRoom({ roomUrl, provider, label }: { roomUrl: string; provider: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let raf = 0;
    let ctx: AudioContext | null = null;
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        ctx.createMediaStreamSource(s).connect(an);
        const data = new Uint8Array(an.frequencyBinCount);
        const tick = () => {
          an.getByteTimeDomainData(data);
          let max = 0;
          for (const v of data) max = Math.max(max, Math.abs(v - 128));
          setLevel(Math.min(100, Math.round((max / 128) * 140)));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr("Non riusciamo ad accedere a camera e microfono. Controlla i permessi del browser: puoi comunque entrare solo con l'audio o la chat.");
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      s?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, []);

  if (joined && provider !== "mock") {
    return <iframe title="Videochiamata" src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[70vh] w-full rounded-2xl border border-ink-100" />;
  }
  if (joined) {
    return (
      <div className="grid h-[60vh] place-items-center rounded-2xl bg-ink-900 text-center text-white">
        <div className="space-y-2 px-6">
          <p className="text-lg font-semibold">Stanza simulata</p>
          <p className="text-sm text-ink-300">Con un fornitore video collegato (VIDEO_PROVIDER=whereby) qui si apre la videochiamata vera. Nessuna registrazione viene effettuata.</p>
          <button onClick={() => setJoined(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm">Esci</button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="overflow-hidden rounded-2xl bg-ink-900">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
      </div>
      {err && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{err}</p>}
      <div>
        <p className="mb-1 text-xs text-ink-500">Test microfono: parla e guarda la barra</p>
        <div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${level}%` }} /></div>
      </div>
      <p className="text-sm text-ink-600">{label}</p>
      <button onClick={() => { stream?.getTracks().forEach((t) => t.stop()); setJoined(true); }} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        Entra ora
      </button>
    </div>
  );
}
