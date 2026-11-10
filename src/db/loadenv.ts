import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Carica .env negli script (senza dipendere da `node --env-file`, che manca nelle versioni di Node più vecchie). */
const file = path.join(process.cwd(), ".env");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
