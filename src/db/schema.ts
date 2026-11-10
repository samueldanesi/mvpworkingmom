import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * MVP su SQLite (un solo file, nessuna installazione).
 *
 * I tre archivi di D-01 restano distinti a livello di organizzazione del codice e dei dati:
 *  - identity : anagrafica, contatti, pagamenti, operatività
 *  - clinical : chat, note, allegati, questionario d'ingresso (dati sulla salute, cifrati a livello di campo)
 *  - analytics: eventi e risposte con pseudonimo, senza nome né contatti
 *  - keys     : mappa utente -> pseudonimo
 * In SQLite stanno nello stesso file; per la produzione (Postgres in UE) vanno in schemi/ruoli separati.
 */

const now = () => new Date();
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const boolean = (name: string) => integer(name, { mode: "boolean" });
const jsonb = (name: string) => text(name, { mode: "json" });
const date = (name: string) => text(name);
const uuid = (name: string) => text(name);
const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const arr = (name: string, def: string[] = []) => text(name, { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => [...def]);

export type Role = "user" | "specialist" | "hr" | "clinical_lead" | "admin";

/* ───────────────────────────── identity ───────────────────────────── */

export const companies = sqliteTable("companies", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  vatNumber: text("vat_number"),
  sdiCode: text("sdi_code"),
  pec: text("pec"),
  coveredEmployees: integer("covered_employees").notNull().default(0),
  includedSessions: integer("included_sessions").notNull().default(3), // per dipendente
  discountPct: integer("discount_pct").notNull().default(0), // sconto sulle sedute successive
  coveredSpecialties: arr("covered_specialties"),
  familyMax: integer("family_max").notNull().default(0), // familiari per dipendente
  familyDiscountPct: integer("family_discount_pct").notNull().default(0),
  allowedDomains: arr("allowed_domains"),
  allowPersonalEmail: boolean("allow_personal_email").notNull().default(false),
  annualFeeCents: integer("annual_fee_cents").notNull().default(0),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  status: text("status").notNull().default("active"), // active | suspended | ended
  pipelineStage: text("pipeline_stage").notNull().default("lancio"), // C-02
  contractValueCents: integer("contract_value_cents").notNull().default(0),
  accountOwner: text("account_owner"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    fullName: text("full_name"),
    phone: text("phone"),
    role: text("role").$type<Role>().notNull().default("user"),
    timezone: text("timezone").notNull().default("Europe/Rome"),
    emailVerifiedAt: ts("email_verified_at"),
    totpSecretEnc: text("totp_secret_enc"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    companyId: uuid("company_id").references(() => companies.id),
    coverageKind: text("coverage_kind").$type<"employee" | "family">(),
    onboardingPath: text("onboarding_path").$type<"private" | "code">(),
    familyOfUserId: uuid("family_of_user_id"),
    accessCodeId: uuid("access_code_id"),
    // D-06: attributi auto-dichiarati (solo per indicatori aggregati)
    gender: text("gender"), // f | m | x | na
    birthYear: integer("birth_year"),
    site: text("site"),
    jobLevel: text("job_level"),
    status: text("status").notNull().default("active"),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("users_company_idx").on(t.companyId)],
);

export const accessCodes = sqliteTable("access_codes", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: text("code").notNull().unique(),
  kind: text("kind").$type<"shared" | "single">().notNull().default("shared"),
  maxUses: integer("max_uses"), // null = illimitato (fino ai posti coperti)
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: ts("expires_at"),
  revokedAt: ts("revoked_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const familyInvites = sqliteTable("family_invites", {
  id: id(),
  code: text("code").notNull().unique(),
  employeeId: uuid("employee_id").notNull().references(() => users.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  usedBy: uuid("used_by"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

/** B-05: registro crediti. delta > 0 assegnati/rimborsati, < 0 consumati/scaduti. */
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    userId: uuid("user_id").references(() => users.id),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<"grant" | "consume" | "refund" | "expire">().notNull(),
    appointmentId: uuid("appointment_id"),
    note: text("note"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("credit_company_idx").on(t.companyId), index("credit_user_idx").on(t.userId)],
);

export const consents = sqliteTable("consents", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // health_data | aggregate_use | terms | privacy | specialist_contract | code_of_conduct
  version: text("version").notNull(),
  grantedAt: ts("granted_at").notNull().$defaultFn(now),
  revokedAt: ts("revoked_at"),
});

export const authTokens = sqliteTable("auth_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").$type<"verify" | "reset">().notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
});

/** C-08: ogni accesso a un dato personale è registrato (chi, quando, perché). */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    reason: text("reason"),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const gdprRequests = sqliteTable("gdpr_requests", {
  id: id(),
  userId: uuid("user_id"),
  userEmail: text("user_email"),
  kind: text("kind").$type<"access" | "rectify" | "erase" | "export">().notNull(),
  status: text("status").$type<"open" | "done" | "rejected">().notNull().default("open"),
  note: text("note"),
  dueAt: ts("due_at").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  closedAt: ts("closed_at"),
});

export const emailTemplates = sqliteTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

export const emailOutbox = sqliteTable("email_outbox", {
  id: id(),
  toEmail: text("to_email").notNull(),
  templateKey: text("template_key"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    text: text("text").notNull(),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("notif_user_idx").on(t.userId)],
);

export const specialistProfiles = sqliteTable("specialist_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  title: text("title"),
  bio: text("bio"),
  approach: text("approach"),
  specializations: arr("specializations"),
  languages: arr("languages", ["it"]),
  gender: text("gender"),
  ageGroups: arr("age_groups"), // fasce età figli seguite
  photoUrl: text("photo_url"),
  registryName: text("registry_name"), // albo / associazione
  registryNumber: text("registry_number"),
  rcPolicyNumber: text("rc_policy_number"),
  cvText: text("cv_text"),
  responseHours: text("response_hours"),
  sessionMinutes: integer("session_minutes").notNull().default(50),
  priceCents: integer("price_cents").notNull().default(4900),
  weeklyCapacity: integer("weekly_capacity").notNull().default(15),
  status: text("status")
    .$type<"received" | "reviewing" | "interview" | "approved" | "rejected" | "suspended">()
    .notNull()
    .default("received"),
  published: boolean("published").notNull().default(false),
  pendingChanges: jsonb("pending_changes").$type<Record<string, unknown> | null>(),
  pendingSubmittedAt: ts("pending_submitted_at"),
  statusNote: text("status_note"),
  approvedAt: ts("approved_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const specialistDocuments = sqliteTable("specialist_documents", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  kind: text("kind").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

/** weekday: 1 = lunedì … 7 = domenica (ISO). Orari nel fuso del professionista. */
export const availabilityRules = sqliteTable("availability_rules", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  weekday: integer("weekday").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  kind: text("kind").$type<"intro" | "session">().notNull(),
});

export const availabilityExceptions = sqliteTable("availability_exceptions", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  day: date("day").notNull(),
  note: text("note"),
});

/** Stato del percorso utente-specialista (S-05, C-03, K-12). */
export const careRelationships = sqliteTable(
  "care_relationships",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    specialistId: uuid("specialist_id").notNull().references(() => users.id),
    status: text("status")
      .$type<"intro_booked" | "intro_done" | "active" | "changed" | "interrupted" | "ended">()
      .notNull()
      .default("intro_booked"),
    changeReason: text("change_reason"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    updatedAt: ts("updated_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("care_unique").on(t.userId, t.specialistId)],
);

export type ApptStatus =
  | "pending_payment"
  | "booked"
  | "completed"
  | "no_show_user"
  | "cancelled_late"
  | "cancelled"
  | "cancelled_by_specialist";

export const appointments = sqliteTable(
  "appointments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    specialistId: uuid("specialist_id").notNull().references(() => users.id),
    kind: text("kind").$type<"intro" | "session">().notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    status: text("status").$type<ApptStatus>().notNull().default("booked"),
    recurrenceId: uuid("recurrence_id"),
    videoProvider: text("video_provider"),
    videoRoomUrl: text("video_room_url"),
    videoHostUrl: text("video_host_url"),
    priceCents: integer("price_cents").notNull().default(0),
    paymentSource: text("payment_source").$type<"free" | "credit" | "personal">().notNull().default("free"),
    holdUntil: ts("hold_until"),
    cancelledAt: ts("cancelled_at"),
    cancelledBy: uuid("cancelled_by"),
    outcomeNote: text("outcome_note"),
    reminded24: boolean("reminded_24").notNull().default(false),
    reminded1: boolean("reminded_1").notNull().default(false),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    // un solo appuntamento attivo per slot del professionista (evita doppie prenotazioni)
    uniqueIndex("appt_slot_unique")
      .on(t.specialistId, t.startsAt)
      .where(sql`status in ('booked','pending_payment')`),
    index("appt_user_idx").on(t.userId),
    index("appt_specialist_idx").on(t.specialistId, t.startsAt),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id),
    specialistId: uuid("specialist_id").references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    feeCents: integer("fee_cents").notNull().default(0), // commissione piattaforma
    specialistNetCents: integer("specialist_net_cents").notNull().default(0),
    source: text("source").$type<"personal" | "company_credit">().notNull(),
    status: text("status")
      .$type<"pending" | "paid" | "failed" | "refunded" | "partially_refunded">()
      .notNull()
      .default("pending"),
    provider: text("provider").notNull().default("mock"),
    providerRef: text("provider_ref"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    failureReason: text("failure_reason"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    paidAt: ts("paid_at"),
    payoutId: uuid("payout_id"),
  },
  (t) => [index("pay_user_idx").on(t.userId), index("pay_specialist_idx").on(t.specialistId)],
);

export const invoices = sqliteTable("invoices", {
  id: id(),
  number: text("number").notNull().unique(),
  kind: text("kind").$type<"invoice" | "credit_note">().notNull().default("invoice"),
  paymentId: uuid("payment_id").references(() => payments.id),
  userId: uuid("user_id").references(() => users.id),
  billToName: text("bill_to_name"),
  billToEmail: text("bill_to_email"),
  description: text("description").notNull(),
  totalCents: integer("total_cents").notNull(),
  issuedAt: ts("issued_at").notNull().$defaultFn(now),
});

export const payouts = sqliteTable("payouts", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  sessionsCount: integer("sessions_count").notNull(),
  grossCents: integer("gross_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  netCents: integer("net_cents").notNull(),
  status: text("status").$type<"pending" | "paid">().notNull().default("pending"),
  providerRef: text("provider_ref"),
  paidAt: ts("paid_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const companyInvoices = sqliteTable("company_invoices", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  number: text("number").notNull().unique(),
  kind: text("kind").$type<"invoice" | "credit_note">().notNull().default("invoice"),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  status: text("status").$type<"draft" | "issued" | "paid">().notNull().default("issued"),
  issuedAt: ts("issued_at").notNull().$defaultFn(now),
});

export const tickets = sqliteTable("tickets", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").$type<"open" | "pending" | "closed">().notNull().default("open"),
  relatedAppointmentId: uuid("related_appointment_id"),
  firstResponseAt: ts("first_response_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  closedAt: ts("closed_at"),
});

export const ticketMessages = sqliteTable("ticket_messages", {
  id: id(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
  senderId: uuid("sender_id"),
  fromStaff: boolean("from_staff").notNull().default(false),
  body: text("body").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

/* ───────────────────────────── clinical ───────────────────────────── */

export const intakeProfiles = sqliteTable("intake_profiles", {
  userId: uuid("user_id").primaryKey(),
  dataEnc: text("data_enc").notNull(), // JSON cifrato (AES-256-GCM)
  step: integer("step").notNull().default(0),
  completedAt: ts("completed_at"),
  safetyFlag: boolean("safety_flag").notNull().default(false),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

export const safetyEvents = sqliteTable("safety_events", {
  id: id(),
  userId: uuid("user_id").notNull(),
  trigger: text("trigger").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  clearedAt: ts("cleared_at"),
  clearedBy: uuid("cleared_by"),
});

export const threads = sqliteTable(
  "threads",
  {
    id: id(),
    userId: uuid("user_id").notNull(),
    specialistId: uuid("specialist_id").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("thread_unique").on(t.userId, t.specialistId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    threadId: uuid("thread_id").notNull().references(() => threads.id),
    senderId: uuid("sender_id").notNull(),
    bodyEnc: text("body_enc").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    readAt: ts("read_at"),
  },
  (t) => [index("msg_thread_idx").on(t.threadId, t.createdAt)],
);

export const attachments = sqliteTable("attachments", {
  id: id(),
  messageId: uuid("message_id").notNull().references(() => messages.id),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
});

export const sessionNotes = sqliteTable("session_notes", {
  id: id(),
  appointmentId: uuid("appointment_id").notNull().unique(),
  specialistId: uuid("specialist_id").notNull(),
  userId: uuid("user_id"),
  contentEnc: text("content_enc").notNull(),
  retained: boolean("retained").notNull().default(false), // conservata per obbligo professionale dopo cancellazione account
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

/** S-11: segnalazione formale al responsabile clinico. Unico canale con cui questi vede contenuti. */
export const clinicalReports = sqliteTable("clinical_reports", {
  id: id(),
  specialistId: uuid("specialist_id").notNull(),
  userId: uuid("user_id"),
  severity: text("severity").$type<"info" | "warning" | "urgent">().notNull().default("info"),
  bodyEnc: text("body_enc").notNull(),
  status: text("status").$type<"new" | "in_review" | "closed">().notNull().default("new"),
  handledBy: uuid("handled_by"),
  outcome: text("outcome"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

/* ───────────────────────────── analytics ───────────────────────────── */

export const subjects = sqliteTable(
  "subjects",
  {
    pseudonym: text("pseudonym").primaryKey(),
    companyId: uuid("company_id"),
    gender: text("gender"),
    ageBand: text("age_band"),
    childrenCount: integer("children_count"),
    childrenAgeBand: text("children_age_band"),
    site: text("site"),
    jobLevel: text("job_level"),
    area: text("area"),
    firstPath: boolean("first_path"),
    consentAggregate: boolean("consent_aggregate").notNull().default(false),
    registeredAt: ts("registered_at").notNull().$defaultFn(now),
  },
  (t) => [index("subj_company_idx").on(t.companyId)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pseudonym: text("pseudonym").notNull(),
    type: text("type").notNull(),
    occurredAt: ts("occurred_at").notNull().$defaultFn(now),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
  },
  (t) => [index("ev_pseudo_idx").on(t.pseudonym), index("ev_type_idx").on(t.type)],
);

export const responses = sqliteTable(
  "responses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pseudonym: text("pseudonym").notNull(),
    instrument: text("instrument").notNull(),
    version: text("version").notNull(),
    moment: text("moment").notNull(), // T0 | T1 | T2 | survey
    score: real("score"),
    items: jsonb("items").$type<Record<string, number>>().notNull().$defaultFn(() => ({})),
    answeredAt: ts("answered_at").notNull().$defaultFn(now),
  },
  (t) => [index("resp_pseudo_idx").on(t.pseudonym)],
);

/** D-07: report emessi immutabili; una correzione genera una nuova versione. */
export const reports = sqliteTable("reports", {
  id: id(),
  companyId: uuid("company_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  version: integer("version").notNull().default(1),
  definitionsVersion: text("definitions_version").notNull(),
  kMin: integer("k_min").notNull(),
  payload: jsonb("payload").notNull(),
  sampleSize: integer("sample_size").notNull(),
  supersedesId: uuid("supersedes_id"),
  createdBy: uuid("created_by"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});

/* ───────────────────────────── keys ───────────────────────────── */

export const pseudonymMap = sqliteTable(
  "pseudonym_map",
  {
    userId: uuid("user_id").notNull(),
    pseudonym: text("pseudonym").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [primaryKey({ columns: [t.userId] }), uniqueIndex("pseudo_unique").on(t.pseudonym)],
);

/** Contatori progressivi (numerazione documenti). */
export const counters = sqliteTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull(),
});

/* ───────────────────────────── MVP: integrazioni simulate, valutazioni, indagine aziendale ───────────────────────────── */

/** Registro delle integrazioni esterne SIMULATE (CRM, calendari, SDI, SMS, push, bonifici). Nessuna chiamata reale. */
export const integrationLog = sqliteTable(
  "integration_log",
  {
    id: id(),
    kind: text("kind").notNull(), // crm | calendar_google | calendar_outlook | sdi | tessera_sanitaria | sms | push | payout
    ref: text("ref"),
    status: text("status").notNull().default("ok"),
    detail: text("detail"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("integ_kind_idx").on(t.kind), index("integ_ref_idx").on(t.ref)],
);

/** S-12: soddisfazione per seduta/colloquio (1-5), niente commenti liberi. */
export const ratings = sqliteTable(
  "ratings",
  {
    id: id(),
    appointmentId: uuid("appointment_id").notNull(),
    userId: uuid("user_id").notNull(),
    specialistId: uuid("specialist_id").notNull(),
    score: integer("score").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("rating_appt_unique").on(t.appointmentId), index("rating_spec_idx").on(t.specialistId)],
);

/** B-10: indagine aziendale anonima. Le risposte stanno nell'archivio analitico (responses) senza alcun legame con le persone. */
export const companySurveys = sqliteTable("company_surveys", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  token: text("token").notNull().unique(),
  round: integer("round").notNull().default(1),
  status: text("status").$type<"open" | "closed">().notNull().default("open"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  closedAt: ts("closed_at"),
});

/** U-16: diario personale (umore e note). Cifrato, visibile solo all'utente: mai a specialista, azienda o backoffice. */
export const diaryEntries = sqliteTable(
  "diary_entries",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    mood: integer("mood").notNull(), // 1-5
    contentEnc: text("content_enc").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("diary_user_idx").on(t.userId, t.createdAt)],
);

/** B-11: calendario di talk e workshop prenotabili dall'azienda. */
export const trainingEvents = sqliteTable("training_events", {
  id: id(),
  title: text("title").notNull(),
  topic: text("topic").notNull(), // genitorialita | carico_di_cura | rientro_maternita
  description: text("description").notNull(),
  startsAt: ts("starts_at").notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  createdAt: ts("created_at").notNull().$defaultFn(now),
});
export const eventBookings = sqliteTable(
  "event_bookings",
  {
    id: id(),
    eventId: uuid("event_id").notNull().references(() => trainingEvents.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("event_company_unique").on(t.eventId, t.companyId)],
);
