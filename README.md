# Working Mom — piattaforma MVP

Web app (PWA) che collega genitori, aziende e specialisti: questionario, matching, colloquio gratuito di 20 minuti,
sedute, chat, pagamenti, console HR con report anonimi, area specialista e backoffice.
Costruita sulle specifiche dell'**Allegato A** (vedi `docs/COPERTURA_ALLEGATO_A.md` per lo stato di ogni requisito).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind 3 · Postgres 16 (Drizzle ORM) · server actions.
Nessun servizio esterno obbligatorio per girare: pagamenti e video hanno adattatori **simulati** (`mock`) e lo scheletro dei veri
(Stripe, Whereby), da collaudare con le chiavi reali.

## Avvio in locale
```bash
npm install
cp .env.example .env            # poi generare AUTH_SECRET e FIELD_ENCRYPTION_KEY (vedi sotto)
# serve un Postgres con ruolo/db `wm`/`workingmom` (o cambiare DATABASE_URL)
npm run db:reset                # crea schemi e tabelle + dati dimostrativi (mai in produzione)
npm run dev                     # http://localhost:3000
```
Segreti: `openssl rand -hex 32` (AUTH_SECRET), `openssl rand -base64 32` (FIELD_ENCRYPTION_KEY).
Le email non partono: in sviluppo si leggono su `/dev/mailbox`.

### Account dimostrativi (password `Demo-Password-1`)
| Ruolo | Email | Note |
|---|---|---|
| Utente nuovo | `nuova@test.it` | percorso completo da fare |
| Dipendente Acme | `anna@acme.test` | onboarding fatto, 2 crediti, percorso attivo con Laura |
| Privato | `privato@test.it` | |
| Specialista | `laura@specialisti.test` (e marco/giulia/chiara/paolo) | 2FA |
| Candidata | `candidata@specialisti.test` | in valutazione |
| HR | `hr@acme.test` · `hr@beta.test` | Acme: dati; Beta: sotto soglia |
| Admin | `admin@workingmom.test` | 2FA |
| Resp. clinico | `clinica@workingmom.test` | 2FA |

2FA di prova per specialisti e staff: segreto TOTP `JBSWY3DPEHPK3PXP` (da aggiungere a un'app di autenticazione).
Codici aziendali: `ACME2026`, `BETA2026` (e casi d'errore: `SCADUTO1`, `REVOCATO`, `MONO0001`).

## Test
```bash
npm test             # unitari: cifratura, TOTP, slot, anonimato, commissioni, matching
npm run test:flows   # integrazione sui 12 scenari di collaudo §10.3 (usa il DB workingmom_test)
npm run typecheck
```

## Architettura in breve
- **Tre archivi separati (D-01)** come schemi Postgres: `identity` (anagrafica, prenotazioni, pagamenti), `clinical` (chat, note,
  questionario d'ingresso: cifrati a livello di campo, AES-256-GCM), `analytics` (eventi e risposte con pseudonimo) + `keys` (mappa
  utente→pseudonimo). In produzione: ruoli DB distinti per schema, chiavi in un KMS.
- **Anonimato (D-05/P-04)**: tutti gli indicatori HR passano da `src/lib/kpi-core.ts` (puro, testato): soglia N su ogni filtro e incrocio,
  soppressione complementare, solo utenti con consenso aggregato. I report emessi sono immutabili e versionati.
- **Permessi (C-08)**: `src/lib/permissions.ts`; ogni pagina/azione del backoffice controlla il permesso, non solo il ruolo.
  Nessun ruolo del backoffice può leggere chat, note o questionari. Ogni apertura di dato personale richiede un motivo ed è in `audit_log`.
- **Prenotazione**: slot calcolati da regole ricorrenti (`src/lib/slots.ts`), indice univoco che impedisce doppie prenotazioni,
  slot in attesa di pagamento riservati 15 minuti.
- **Adattatori**: `src/lib/payments`, `src/lib/video`. `src/lib/mail.ts` scrive nel registro invii (collegare un provider UE).
- **Promemoria**: `GET /api/cron/reminders` con `Authorization: Bearer $CRON_SECRET` ogni 5-10 minuti.

## Prima del lancio (non è un elenco esaustivo)
Vedi `docs/DA_DECIDERE_E_FORNIRE.md`.
