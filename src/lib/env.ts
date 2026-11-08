const int = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  appUrl: process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
  /** Cookie "Secure" solo se il sito è davvero in HTTPS (Safari li rifiuta su http://localhost). */
  secureCookies: (process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").startsWith("https://"),
  /** Modalità dimostrativa: posta simulata visibile e strumenti di collaudo attivi anche con NODE_ENV=production. */
  demoMode: process.env.DEMO_MODE === "1",
  platformFeePct: int(process.env.PLATFORM_FEE_PCT, 30), // commissione sulle consulenze
  cancelNoticeHours: int(process.env.CANCEL_NOTICE_HOURS, 24), // U-11
  kMin: int(process.env.K_MIN, 10), // D-05
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "stripe",
  videoProvider: (process.env.VIDEO_PROVIDER ?? "mock") as "mock" | "whereby",
  holdMinutes: 15, // tempo massimo per pagare una seduta prima che lo slot torni libero
  introMinutes: 20,
};

/** Ruoli per cui il 2FA è obbligatorio (P-06). */
export const TWO_FA_ROLES = ["specialist", "clinical_lead", "admin"] as const;
