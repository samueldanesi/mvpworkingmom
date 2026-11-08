import { Badge, Card, LinkButton } from "@/components/ui";
import { LANGUAGES, SPECIALTIES } from "@/lib/constants";
import { eur, fmtDateTime } from "@/lib/format";
import type { PublicSpecialist } from "@/server/queries";

export function SpecialistCard({ s, tz, reasons, highlight }: { s: PublicSpecialist; tz: string; reasons?: string[]; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-brand-200" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3>{s.name}</h3>
          <p className="text-sm text-ink-500">{s.profile.title}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {s.profile.specializations.map((x) => (
              <Badge key={x} tone="brand">{SPECIALTIES[x] ?? x}</Badge>
            ))}
            {s.profile.languages.map((l) => (
              <Badge key={l}>{LANGUAGES[l] ?? l}</Badge>
            ))}
          </div>
          {reasons && reasons.length > 0 && <p className="pt-1 text-xs text-teal-700">✓ {reasons.join(" · ")}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{eur(s.profile.priceCents)} / {s.profile.sessionMinutes} min</p>
          <p className="text-xs text-ink-500">{s.nextSlot ? `Primo colloquio: ${fmtDateTime(s.nextSlot, tz)}` : "Nessuna disponibilità a breve"}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ink-700">{s.profile.approach}</p>
      <div className="mt-3 flex gap-2">
        <LinkButton href={`/app/specialists/${s.id}`} variant="secondary">Vedi profilo</LinkButton>
        <LinkButton href={`/app/book/${s.id}?kind=intro`}>Colloquio gratuito</LinkButton>
      </div>
    </Card>
  );
}
