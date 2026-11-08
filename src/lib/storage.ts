import "server-only";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { decryptBuffer, encryptBuffer } from "./crypto";

/**
 * Allegati e documenti: cifrati prima di essere scritti. In produzione sostituire con un bucket
 * (S3/GCS regione UE) mantenendo la stessa interfaccia.
 */
const ROOT = process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage");
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"];

export async function saveEncrypted(buf: Buffer): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  const key = randomUUID();
  await writeFile(path.join(ROOT, key), encryptBuffer(buf));
  return key;
}

export async function readEncrypted(key: string): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("chiave non valida");
  return decryptBuffer(await readFile(path.join(ROOT, key)));
}

export async function removeFile(key: string) {
  if (!/^[0-9a-f-]{36}$/.test(key)) return;
  await rm(path.join(ROOT, key), { force: true });
}

export function checkUpload(f: File): string | null {
  if (f.size > MAX_FILE_BYTES) return "Il file supera i 5 MB.";
  if (!ALLOWED_MIME.includes(f.type)) return "Formato non ammesso (PDF, immagini o testo).";
  return null;
}
