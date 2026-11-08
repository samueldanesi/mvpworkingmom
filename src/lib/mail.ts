import { eq } from "drizzle-orm";
import { db, emailOutbox, emailTemplates } from "@/db";
import { env } from "./env";

/** C-10 / T-05: modelli modificabili dal backoffice, registro degli invii. */
export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  verify_email: {
    subject: "Conferma il tuo indirizzo email",
    body: "Ciao {{name}},\n\nconferma la tua email cliccando qui:\n{{link}}\n\nIl link scade tra 24 ore.\n\nWorking Mom",
  },
  reset_password: {
    subject: "Recupero password",
    body: "Ciao {{name}},\n\nper scegliere una nuova password apri:\n{{link}}\n\nIl link scade tra 1 ora. Se non l'hai chiesto tu, ignora questo messaggio.\n\nWorking Mom",
  },
  appointment_confirmed: {
    subject: "Appuntamento confermato: {{when}}",
    body: "Ciao {{name}},\n\nil tuo {{kind}} con {{specialist}} è confermato per {{when}}.\nGestisci o sposta l'appuntamento: {{link}}\n\nPuoi aggiungerlo al calendario con il file .ics scaricabile dalla pagina.\n\nWorking Mom",
  },
  reminder_24h: {
    subject: "Promemoria: appuntamento domani alle {{time}}",
    body: "Ciao {{name}},\n\nti ricordiamo il {{kind}} con {{specialist}}: {{when}}.\nSe devi disdire, fallo entro il preavviso indicato per non perdere la seduta: {{link}}\n\nWorking Mom",
  },
  reminder_1h: {
    subject: "Tra un'ora: appuntamento con {{specialist}}",
    body: "Ciao {{name}},\n\ntra circa un'ora inizia il tuo {{kind}} ({{when}}).\nEntra qui: {{link}}\n\nWorking Mom",
  },
  appointment_cancelled: {
    subject: "Appuntamento annullato",
    body: "Ciao {{name}},\n\nl'appuntamento del {{when}} con {{specialist}} è stato annullato.\n{{detail}}\n\nWorking Mom",
  },
  payment_failed: {
    subject: "Pagamento non riuscito",
    body: "Ciao {{name}},\n\nil pagamento per l'appuntamento del {{when}} non è andato a buon fine, quindi lo slot non è stato confermato.\nRiprova dalla tua area: {{link}}\n\nWorking Mom",
  },
  invoice_available: {
    subject: "La tua fattura {{number}} è disponibile",
    body: "Ciao {{name}},\n\npuoi scaricare la fattura {{number}} dalla sezione Fatture: {{link}}\n\nWorking Mom",
  },
  specialist_status: {
    subject: "Aggiornamento sulla tua candidatura",
    body: "Ciao {{name}},\n\nlo stato della tua candidatura è ora: {{status}}.\n{{detail}}\n\nWorking Mom",
  },
  hr_invite: {
    subject: "Accesso alla console HR di Working Mom",
    body: "Ciao {{name}},\n\nè stato creato il tuo accesso alla console HR di {{company}}.\nImposta la password da qui: {{link}}\n\nWorking Mom",
  },
};

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

export async function sendMail(key: keyof typeof DEFAULT_TEMPLATES | string, to: string, vars: Record<string, string>) {
  const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key)).limit(1);
  const tpl = row ?? DEFAULT_TEMPLATES[key];
  if (!tpl) throw new Error(`Modello email sconosciuto: ${key}`);
  const subject = render(tpl.subject, vars);
  const body = render(tpl.body, vars);
  // In sviluppo le email finiscono nel registro (/dev/mailbox). In produzione: collegare un provider
  // transazionale UE (Postmark/Brevo/Resend o Go High Level) qui sotto.
  await db.insert(emailOutbox).values({ toEmail: to, templateKey: key, subject, body, status: env.isProd ? "queued" : "sent" });
}
