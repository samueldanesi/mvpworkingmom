/**
 * U-05: controllo di sicurezza. Parole o risposte di allarme bloccano la prenotazione e
 * portano ai numeri di emergenza. È un filtro prudenziale, NON uno strumento diagnostico:
 * la lista va rivista con il responsabile clinico.
 */
const ALARM_PATTERNS: RegExp[] = [
  /suicid/i,
  /togliermi la vita/i,
  /farla finita/i,
  /non voglio pi[uù] vivere/i,
  /voglio morire/i,
  /farmi del male/i,
  /autolesion/i,
  /uccider/i,
  /ammazz/i,
  /far(e)? del male (a|al|alla|ai|alle) (mio|mia|miei|mie|bambin|figli)/i,
  /maltratt/i,
  /abus(o|i|ato|ata)/i,
  /mi (picchia|picchiano|minaccia)/i,
  /violenza (domestica|in casa)/i,
  /emergenza/i,
];

export function detectAlarm(text: string | undefined | null): string | null {
  if (!text) return null;
  for (const p of ALARM_PATTERNS) if (p.test(text)) return p.source;
  return null;
}
