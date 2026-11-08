import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://wm:wm@localhost:5432/workingmom";

const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };
const client = globalForDb.__sql ?? postgres(url, { max: 10, onnotice: () => {} });
if (process.env.NODE_ENV !== "production") globalForDb.__sql = client;

export const db = drizzle(client, { schema });
export const sqlClient = client;
export type Db = typeof db;
export * from "./schema";
