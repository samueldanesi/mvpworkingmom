import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/** MVP: un solo file SQLite (data/wm.db). In produzione: Postgres in UE, con schemi e ruoli separati. */
const url = process.env.DATABASE_URL ?? "file:./data/wm.db";
if (url.startsWith("file:") && !url.includes(":memory:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });

const g = globalThis as unknown as { __libsql?: ReturnType<typeof createClient> };
const client = g.__libsql ?? createClient({ url });
if (!g.__libsql) {
  g.__libsql = client;
  // attesa sui lock e journal WAL: più letture/scritture concorrenti senza errori "database is locked"
  void client.execute("PRAGMA busy_timeout = 5000").catch(() => {});
  void client.execute("PRAGMA journal_mode = WAL").catch(() => {});
}

export const db = drizzle(client, { schema });
export const sqlClient = client;
export type Db = typeof db;

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export * from "./schema";
