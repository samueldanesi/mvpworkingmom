# Copertura dell'Allegato A

## Aggiornamento MVP con dati simulati (9.11.2026)

L'MVP è completo per la demo: tutte le integrazioni esterne sono **simulate** (nessuna chiamata reale, tutto registrato in `/admin/integrations`).

| ID | Ora | Come |
|---|---|---|
| B-10, K-14 | ✅ | `/hr/surveys` (HR) e pagina pubblica anonima `/survey/<token>`; K-14 con confronto tra rilevazioni e soglia D-05 |
| B-05 | ✅ | `expireCredits`: i crediti residui di aziende con contratto scaduto passano a «scaduti» (cron o `/admin/integrations`) |
| D-08 | ✅ | `runRetention` con tempi configurabili in `/admin/integrations` (valori da concordare col DPO) |
| S-12 | ✅ | Valutazione 1-5 dell'utente dopo il colloquio/seduta; media per specialista sopra soglia |
| C-03 | ✅ | Tassi per canale/azienda e per specialista nella panoramica backoffice |
| C-01 | ✅ | Cronologia unificata nella scheda utente (appuntamenti, pagamenti, ticket, accessi staff) |
| C-02 | 🟡 simulato | Sync CRM finta, registro in `/admin/integrations` |
| S-04, T-06 | 🟡 simulato | Collega Google/Outlook dall'agenda dello specialista |
| S-09 | 🟡 simulato | «Segna pagato» esegue un trasferimento Connect finto |
| T-07 | 🟡 simulato | Ogni fattura viene «inviata» a SDI e Tessera Sanitaria (finti) |
| T-05, C-10 | 🟡 simulato | SMS e push finti accanto alle email nei promemoria |
| T-01 | ✅ | Service worker e pagina offline (testi in italiano; file di traduzione non ancora predisposto) |
| B-11 | ✅ | `/hr/events`: calendario talk e workshop (genitorialità, carico di cura, rientro dalla maternità), prenotabili dall'azienda |
| U-13 | ✅ simulato | Pagina di pagamento con carta di prova e «buono welfare (simulato)» |
| B-09 | ✅ | Report PDF/CSV e «Export certificazioni» (CSV con gli indicatori utili a UNI/PdR 125 e 192) |
| T-12 | ✅ simulato | `/admin/integrations`: copia di sicurezza e prova di ripristino |
| C-05, C-11 | ✅ | Soddisfazione media per specialista nella scheda in backoffice |
| T-11 | ✅ | CI GitHub Actions (typecheck, test, build) |

Restano fuori dall'MVP, come da §10.1: T-10 (welfare diretto e SSO), app nativa, più lingue. I punti ⏳ dipendono dalle decisioni della Committente.

Legenda: ✅ fatto e collaudato · 🟡 fatto in forma semplificata o con dati/testi provvisori · 🔌 pronto ma da collegare/collaudare con account reali · ⛔ non fatto · ⏳ bloccato da una decisione della Committente

## Utente (§3)
| ID | Stato | Note |
|---|---|---|
| U-01 | ✅ | Email+password, verifica email, recupero, blocco dopo 5 tentativi. Scelta "Per me / codice" subito dopo. |
| U-02 | ✅ | Codice o riconoscimento del dominio; validità, scadenza, revoca, posti residui, copertura mostrata. |
| U-03 | ✅ | Consenso salute separato da quello per i report aggregati; revocabili in Impostazioni. Testi legali segnaposto (P-13). |
| U-04 | ✅ | 5 schermate con salvataggio parziale; dati cifrati. |
| U-05 | 🟡 | Risposte e parole di allarme → numeri di emergenza + blocco prenotazione fino a sblocco del resp. clinico. **La lista di parole va rivista con il responsabile clinico.** |
| U-06 | ✅ | Pesi configurabili in `src/lib/matching.ts` (non da interfaccia); 3 proposte + elenco con filtri. |
| U-07 | ✅ | |
| U-08 | ✅ | Slot reali, fuso dell'utente, conferma email, .ics, un colloquio gratuito per specialista. |
| U-09 | 🟡🔌 | Sala d'attesa con test audio/video reale. Stanza **simulata**; adattatore Whereby scritto, non provato con una chiave. |
| U-10 | ✅ | |
| U-11 | ✅ | Singola o ricorrente (settimanale, fino a 8); sposta/disdici self-service; preavviso configurabile (default 24 h). |
| U-12 | ✅ | Testo + allegati cifrati, orari di risposta, avviso emergenza. Aggiornamento a polling (8 s), niente push. |
| U-13 | 🟡🔌 | Crediti prima del personale ✅. Checkout **simulato**; Stripe Checkout/Connect scritto, non provato. Apple/Google Pay passano da Stripe. Buono welfare: non integrato (solo fattura, B-06). |
| U-14 | 🟡 | Agenda e PDF per seduta ✅. **Non è fattura elettronica SDI** (T-07). |
| U-15 | 🟡 | T0/T1/T2 ✅. WHO-5 reale; carico mentale/di cura/conflitto sono **bozze** da sostituire (D-04). |
| U-16 | ✅ | Diario privato con umore e note, cifrato (`/app/diary`). Incluso nell'esportazione e nella cancellazione dei dati. |
| U-17 | ✅ | Modifica dati, consensi, export JSON, cancellazione account. |
| U-18 | ✅ | Ticket + FAQ. |

## Canale aziende (§4)
| ID | Stato | Note |
|---|---|---|
| B-01/B-02 | ✅ | Gestiti dal backoffice; l'HR li vede in sola lettura. |
| B-03 | ✅ | Codice unico e monouso, domini ammessi, scadenza, revoca, link e QR. |
| B-04 | ✅ | Nessuna pagina HR interroga utenti; crediti e KPI sotto soglia nascosti. |
| B-05 | ✅ | Registro crediti (sotto soglia nascosto all'HR). Crediti "scaduti": il campo c'è, **manca il processo che li fa scadere**. |
| B-06 | 🟡 | Fattura intestata all'utente ✅; integrazione diretta con piattaforme welfare ⛔ (T-10, dopo). |
| B-07 | 🟡 | Kit di comunicazione ✅; pagina di lancio dedicata per azienda ⛔ (nell'MVP solo Working Mom). |
| B-08/B-09 | ✅ | Dashboard con filtri; report PDF e CSV, immutabili e versionati. |
| B-10 | ⛔ | Indagine aziendale anonima (K-14). |
| B-11 | ⛔ | Dopo l'MVP. |

## Specialista (§5)
| ID | Stato | Note |
|---|---|---|
| S-01/S-02 | ✅ | Candidatura con documenti cifrati, stati, approvazione manuale, accettazione con data e versione. Testo del contratto segnaposto. |
| S-03 | ✅ | Modifiche in coda di approvazione. |
| S-04 | 🟡 | Disponibilità ricorrenti, eccezioni, slot diversi, fusi ✅. **Sync Google/Outlook ⛔** (solo .ics). |
| S-05/S-06/S-07 | ✅ | Note cifrate, visibili solo al professionista. |
| S-08 | 🟡 | Modelli di risposta e link di prenotazione; niente costruttore di proposte ricorrenti. |
| S-09 | 🟡🔌 | Riepilogo netto commissione 30%, estratto CSV, liquidazioni generate dal backoffice. **Il bonifico Stripe Connect non è collegato** (si segna "pagato" a mano). |
| S-10 | ⏳ | Modello fiscale da decidere (Allegato A §10.2 punto 2). |
| S-11 | ✅ | |
| S-12 | 🟡 | Solo prosecuzione/cambio, sopra soglia; nessuna soddisfazione per specialista. |

## Backoffice (§6)
| ID | Stato | Note |
|---|---|---|
| C-01 | 🟡 | Anagrafiche e ricerca ✅; niente "scheda con cronologia di eventi e documenti" unificata (c'è audit e storico appuntamenti/pagamenti). |
| C-02 | 🟡 | Fase commerciale e valore su azienda; **nessuna sync HubSpot/GoHighLevel**. |
| C-03 | ✅ | Imbuto in tempo reale; tassi per canale/azienda/specialista ⛔. |
| C-04 | ✅ | Avvisi su crediti residui <20% e contratti in scadenza (60 gg). |
| C-05/C-11 | 🟡 | Pipeline, capacità, assenze, segnalazioni, cambi con motivo. Soddisfazione per specialista ⛔. |
| C-06 | ✅ | Ticket con tempi di prima risposta, rimborsi totali/parziali. |
| C-07 | 🟡 | Incassi, commissioni, liquidazioni, fatture e note di credito aziende (registrate, **non emesse SDI**), riconciliazione con riferimenti. |
| C-08 | ✅ | Permessi granulari, motivo obbligatorio, registro accessi. |
| C-09 | ✅ | Registro con scadenza 30 gg; export e cancellazione eseguibili. |
| C-10 | 🟡 | Modelli modificabili, registro invii, promemoria 24 h/1 h (serve uno scheduler esterno). **Nessun provider email collegato**; SMS e push ⛔. |

## Dati e KPI (§7)
D-01 🟡 (tre archivi distinti ma nello stesso file SQLite: la separazione fisica arriva con Postgres), D-02, D-03, D-05…D-07 ✅. **D-04** 🟡 (strumenti da scegliere). **D-08** ⛔ (nessun job di conservazione/scadenza dati: tempi da definire con il DPO).
K-01…K-12, K-15 ✅ (K-13 non esiste nel documento); K-14 ⛔. Il collegamento indicatore↔prassi UNI va fatto con un lead auditor (§7.3).

## Privacy e sicurezza (§8)
| ID | Stato | Note |
|---|---|---|
| P-01 | ✅ | |
| P-03 | ⏳ | Titolare/responsabile da fornire. |
| P-04 | ✅ | Soglia su ogni filtro, testata. |
| P-05 | 🟡 | Database SQLite non cifrato a riposo (in produzione: Postgres in UE con cifratura del disco). Cifratura a livello di campo (AES-256-GCM) e degli allegati. Chiave da variabile d'ambiente: in produzione KMS. Cifratura a riposo del disco e "server in UE" dipendono dall'hosting scelto. |
| P-06 | 🟡 | 2FA obbligatorio (specialisti, resp. clinico, admin), sessioni 8 h, audit. "Inalterabile": l'app non modifica né cancella il log, ma servono permessi DB di sola aggiunta. |
| P-07 | 🔌 | Whereby configurato senza registrazione; non provato. |
| P-08 | ✅ | Nessun dato carta nei nostri sistemi (per costruzione). |
| P-09 | ⏳ | Si raccolgono solo fasce d'età dei figli, nessun account di minori. Regola sul consenso di entrambi i genitori da decidere. |
| P-10 | ✅ | Pagina `/emergency`, avvisi in chat e prenotazione, protocollo per lo specialista. |
| P-11 | ✅ | Cancellazione conserva fatture e appunti professionali scollegati. |
| P-12/P-13 | ⏳ | Natura del servizio e testi legali: segnaposto. |

## Tecnica (§9)
| ID | Stato | Note |
|---|---|---|
| T-01 | 🟡 | Responsive, manifest PWA, italiano. **Niente service worker** (installabile ma non offline); testi non ancora in file di traduzione. |
| T-02 | ✅ | Ogni query HR è vincolata all'azienda dell'utente; verificato con test. |
| T-03/T-04 | 🔌 | Vedi U-13, U-09. |
| T-05 | 🟡 | Solo registro email. Go High Level non collegato. |
| T-06 | 🟡 | .ics ✅; sync Google/Microsoft ⛔. |
| T-07 | ⛔ | Fatturazione elettronica SDI/Tessera Sanitaria: serve fornitore e commercialista. |
| T-08 | ⛔ | Zendesk/CRM esterno: assistenza interna al posto. |
| T-09 | ✅ | PDF e CSV generati dal sistema. |
| T-11 | 🟡 | Variabili d'ambiente per ambiente, dati di prova mai copiati dai reali; **rilascio automatico (CI/CD) non configurato**. |
| T-12 | ⛔ | Backup con prova di ripristino, monitoraggio: dipendono dall'hosting. |
| T-13 | 🟡 | Segreti da env, dipendenze pinnate. **Penetration test di terzi ⛔.** `npm audit` segnala advisory su PostCSS dentro Next 15: aggiornare Next prima del lancio. |
| T-14 | 🟡 | Pagine leggere; non misurato su rete mobile. |
| T-15 | ✅ | Codice di proprietà Working Mom; elenco licenze in `docs/LICENZE.md`. |

## Collaudo §10.3
I 12 scenari sono coperti da `npm run test:flows` (service layer, DB reale) e da un giro nel browser sulle parti visibili (registrazione, 2FA, onboarding,
prenotazione, pagamento simulato, fattura PDF, report HR, permessi). Non ancora eseguiti **in produzione** (richiesto dall'Allegato).
