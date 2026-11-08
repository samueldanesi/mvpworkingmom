import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * D-01: tre archivi separati + uno per le chiavi di collegamento.
 *  - identity : anagrafica, contatti, pagamenti, operatività
 *  - clinical : chat, note, allegati, questionario d'ingresso (dati sulla salute)
 *  - analytics: eventi e risposte con pseudonimo, senza nome né contatti
 *  - keys     : mappa utente -> pseudonimo (da isolare con ruolo DB dedicato in produzione)
 */
export const identity = pgSchema("identity");
export const clinical = pgSchema("clinical");
export const analytics = pgSchema("analytics");
export const keys = pgSchema("keys");

const ts = (name: string) => timestamp(name, { withTimezone: true });
const id = () => uuid("id").primaryKey().defaultRandom();

export type Role = "user" | "specialist" | "hr" | "clinical_lead" | "admin";

/* ───────────────────────────── identity ───────────────────────────── */

export const companies = identity.table("companies", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  vatNumber: text("vat_number"),
  sdiCode: text("sdi_code"),
  pec: text("pec"),
  coveredEmployees: integer("covered_employees").notNull().default(0),
  includedSessions: integer("included_sessions").notNull().default(3), // per dipendente
  discountPct: integer("discount_pct").notNull().default(0), // sconto sulle sedute successive
  coveredSpecialties: text("covered_specialties").array().notNull().default(sql`'{}'::text[]`),
  familyMax: integer("family_max").notNull().default(0), // familiari per dipendente
  familyDiscountPct: integer("family_discount_pct").notNull().default(0),
  allowedDomains: text("allowed_domains").array().notNull().default(sql`'{}'::text[]`),
  allowPersonalEmail: boolean("allow_personal_email").notNull().default(false),
  annualFeeCents: integer("annual_fee_cents").notNull().default(0),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  status: text("status").notNull().default("active"), // active | suspended | ended
  pipelineStage: text("pipeline_stage").notNull().default("lancio"), // C-02
  contractValueCents: integer("contract_value_cents").notNull().default(0),
  accountOwner: text("account_owner"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const users = identity.table(
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
    createdAt: ts("created_at").notNull().defaultNow(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("users_company_idx").on(t.companyId)],
);

export const accessCodes = identity.table("access_codes", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  code: text("code").notNull().unique(),
  kind: text("kind").$type<"shared" | "single">().notNull().default("shared"),
  maxUses: integer("max_uses"), // null = illimitato (fino ai posti coperti)
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: ts("expires_at"),
  revokedAt: ts("revoked_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const familyInvites = identity.table("family_invites", {
  id: id(),
  code: text("code").notNull().unique(),
  employeeId: uuid("employee_id").notNull().references(() => users.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  usedBy: uuid("used_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** B-05: registro crediti. delta > 0 assegnati/rimborsati, < 0 consumati/scaduti. */
export const creditLedger = identity.table(
  "credit_ledger",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    userId: uuid("user_id").references(() => users.id),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<"grant" | "consume" | "refund" | "expire">().notNull(),
    appointmentId: uuid("appointment_id"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("credit_company_idx").on(t.companyId), index("credit_user_idx").on(t.userId)],
);

export const consents = identity.table("consents", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // health_data | aggregate_use | terms | privacy | specialist_contract | code_of_conduct
  version: text("version").notNull(),
  grantedAt: ts("granted_at").notNull().defaultNow(),
  revokedAt: ts("revoked_at"),
});

export const authTokens = identity.table("auth_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind").$type<"verify" | "reset">().notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
});

/** C-08: ogni accesso a un dato personale è registrato (chi, quando, perché). */
export const auditLog = identity.table(
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
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const gdprRequests = identity.table("gdpr_requests", {
  id: id(),
  userId: uuid("user_id"),
  userEmail: text("user_email"),
  kind: text("kind").$type<"access" | "rectify" | "erase" | "export">().notNull(),
  status: text("status").$type<"open" | "done" | "rejected">().notNull().default("open"),
  note: text("note"),
  dueAt: ts("due_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  closedAt: ts("closed_at"),
});

export const emailTemplates = identity.table("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const emailOutbox = identity.table("email_outbox", {
  id: id(),
  toEmail: text("to_email").notNull(),
  templateKey: text("template_key"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const notifications = identity.table(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    text: text("text").notNull(),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notif_user_idx").on(t.userId)],
);

export const specialistProfiles = identity.table("specialist_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  title: text("title"),
  bio: text("bio"),
  approach: text("approach"),
  specializations: text("specializations").array().notNull().default(sql`'{}'::text[]`),
  languages: text("languages").array().notNull().default(sql`'{it}'::text[]`),
  gender: text("gender"),
  ageGroups: text("age_groups").array().notNull().default(sql`'{}'::text[]`), // fasce età figli seguite
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
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const specialistDocuments = identity.table("specialist_documents", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  kind: text("kind").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** weekday: 1 = lunedì … 7 = domenica (ISO). Orari nel fuso del professionista. */
export const availabilityRules = identity.table("availability_rules", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  weekday: integer("weekday").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  kind: text("kind").$type<"intro" | "session">().notNull(),
});

export const availabilityExceptions = identity.table("availability_exceptions", {
  id: id(),
  specialistId: uuid("specialist_id").notNull().references(() => users.id),
  day: date("day").notNull(),
  note: text("note"),
});

/** Stato del percorso utente-specialista (S-05, C-03, K-12). */
export const careRelationships = identity.table(
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
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
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

export const appointments = identity.table(
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
    createdAt: ts("created_at").notNull().defaultNow(),
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

export const payments = identity.table(
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
    createdAt: ts("created_at").notNull().defaultNow(),
    paidAt: ts("paid_at"),
    payoutId: uuid("payout_id"),
  },
  (t) => [index("pay_user_idx").on(t.userId), index("pay_specialist_idx").on(t.specialistId)],
);

export const invoices = identity.table("invoices", {
  id: id(),
  number: text("number").notNull().unique(),
  kind: text("kind").$type<"invoice" | "credit_note">().notNull().default("invoice"),
  paymentId: uuid("payment_id").references(() => payments.id),
  userId: uuid("user_id").references(() => users.id),
  billToName: text("bill_to_name"),
  billToEmail: text("bill_to_email"),
  description: text("description").notNull(),
  totalCents: integer("total_cents").notNull(),
  issuedAt: ts("issued_at").notNull().defaultNow(),
});

export const payouts = identity.table("payouts", {
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
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const companyInvoices = identity.table("company_invoices", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  number: text("number").notNull().unique(),
  kind: text("kind").$type<"invoice" | "credit_note">().notNull().default("invoice"),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  status: text("status").$type<"draft" | "issued" | "paid">().notNull().default("issued"),
  issuedAt: ts("issued_at").notNull().defaultNow(),
});

export const tickets = identity.table("tickets", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),
  status: text("status").$type<"open" | "pending" | "closed">().notNull().default("open"),
  relatedAppointmentId: uuid("related_appointment_id"),
  firstResponseAt: ts("first_response_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  closedAt: ts("closed_at"),
});

export const ticketMessages = identity.table("ticket_messages", {
  id: id(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
  senderId: uuid("sender_id"),
  fromStaff: boolean("from_staff").notNull().default(false),
  body: text("body").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const settings = identity.table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

/* ───────────────────────────── clinical ───────────────────────────── */

export const intakeProfiles = clinical.table("intake_profiles", {
  userId: uuid("user_id").primaryKey(),
  dataEnc: text("data_enc").notNull(), // JSON cifrato (AES-256-GCM)
  step: integer("step").notNull().default(0),
  completedAt: ts("completed_at"),
  safetyFlag: boolean("safety_flag").notNull().default(false),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const safetyEvents = clinical.table("safety_events", {
  id: id(),
  userId: uuid("user_id").notNull(),
  trigger: text("trigger").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  clearedAt: ts("cleared_at"),
  clearedBy: uuid("cleared_by"),
});

export const threads = clinical.table(
  "threads",
  {
    id: id(),
    userId: uuid("user_id").notNull(),
    specialistId: uuid("specialist_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("thread_unique").on(t.userId, t.specialistId)],
);

export const messages = clinical.table(
  "messages",
  {
    id: id(),
    threadId: uuid("thread_id").notNull().references(() => threads.id),
    senderId: uuid("sender_id").notNull(),
    bodyEnc: text("body_enc").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    readAt: ts("read_at"),
  },
  (t) => [index("msg_thread_idx").on(t.threadId, t.createdAt)],
);

export const attachments = clinical.table("attachments", {
  id: id(),
  messageId: uuid("message_id").notNull().references(() => messages.id),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
});

export const sessionNotes = clinical.table("session_notes", {
  id: id(),
  appointmentId: uuid("appointment_id").notNull().unique(),
  specialistId: uuid("specialist_id").notNull(),
  userId: uuid("user_id"),
  contentEnc: text("content_enc").notNull(),
  retained: boolean("retained").notNull().default(false), // conservata per obbligo professionale dopo cancellazione account
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** S-11: segnalazione formale al responsabile clinico. Unico canale con cui questi vede contenuti. */
export const clinicalReports = clinical.table("clinical_reports", {
  id: id(),
  specialistId: uuid("specialist_id").notNull(),
  userId: uuid("user_id"),
  severity: text("severity").$type<"info" | "warning" | "urgent">().notNull().default("info"),
  bodyEnc: text("body_enc").notNull(),
  status: text("status").$type<"new" | "in_review" | "closed">().notNull().default("new"),
  handledBy: uuid("handled_by"),
  outcome: text("outcome"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/* ───────────────────────────── analytics ───────────────────────────── */

export const subjects = analytics.table(
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
    registeredAt: ts("registered_at").notNull().defaultNow(),
  },
  (t) => [index("subj_company_idx").on(t.companyId)],
);

export const events = analytics.table(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    pseudonym: text("pseudonym").notNull(),
    type: text("type").notNull(),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("ev_pseudo_idx").on(t.pseudonym), index("ev_type_idx").on(t.type)],
);

export const responses = analytics.table(
  "responses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    pseudonym: text("pseudonym").notNull(),
    instrument: text("instrument").notNull(),
    version: text("version").notNull(),
    moment: text("moment").notNull(), // T0 | T1 | T2 | survey
    score: real("score"),
    items: jsonb("items").$type<Record<string, number>>().notNull().default({}),
    answeredAt: ts("answered_at").notNull().defaultNow(),
  },
  (t) => [index("resp_pseudo_idx").on(t.pseudonym)],
);

/** D-07: report emessi immutabili; una correzione genera una nuova versione. */
export const reports = analytics.table("reports", {
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
  createdAt: ts("created_at").notNull().defaultNow(),
});

/* ───────────────────────────── keys ───────────────────────────── */

export const pseudonymMap = keys.table(
  "pseudonym_map",
  {
    userId: uuid("user_id").notNull(),
    pseudonym: text("pseudonym").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId] }), uniqueIndex("pseudo_unique").on(t.pseudonym)],
);
