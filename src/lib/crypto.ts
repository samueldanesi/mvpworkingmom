import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * P-05: cifratura a livello di campo (AES-256-GCM). La chiave è separata dal database
 * (variabile d'ambiente / KMS in produzione) e versionata con il prefisso "v1:".
 */
function key(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY mancante");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY deve essere 32 byte in base64");
  return k;
}

export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}

export function decryptBuffer(blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

export function encryptText(plain: string): string {
  return "v1:" + encryptBuffer(Buffer.from(plain, "utf8")).toString("base64");
}

export function decryptText(enc: string): string {
  if (!enc.startsWith("v1:")) throw new Error("formato cifratura sconosciuto");
  return decryptBuffer(Buffer.from(enc.slice(3), "base64")).toString("utf8");
}

export function encryptJson(v: unknown): string {
  return encryptText(JSON.stringify(v));
}

export function decryptJson<T>(enc: string): T {
  return JSON.parse(decryptText(enc)) as T;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Pseudonimo stabile non derivabile dall'ID utente senza la chiave di collegamento. */
export function newPseudonym(): string {
  return "p_" + randomBytes(12).toString("hex");
}

export function hmac(data: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(data).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Codice leggibile (senza caratteri ambigui) per codici aziendali. */
export function readableCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
