import Link from "next/link";
import { PublicShell } from "@/components/Shell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md space-y-3 text-center">
        <h1>Pagina non trovata</h1>
        <p className="text-sm text-ink-600">Il link potrebbe essere scaduto o non essere più valido.</p>
        <Link href="/">Torna alla home</Link>
      </div>
    </PublicShell>
  );
}
