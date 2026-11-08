/**
 * Avvio locale in un solo comando: `npm run local`
 * - avvia un Postgres incorporato (dati in ./.pgdata, porta 5433), senza installare nulla;
 * - crea .env con segreti casuali se manca;
 * - al primo avvio crea le tabelle e carica i dati dimostrativi;
 * - lancia l'app su http://localhost:3000.
 * Solo per prove locali. In produzione si usa un Postgres gestito in UE.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const root = path.resolve(__dirname, "..");
const PORT = 5433;
const URL = `postgres://wm:wm@localhost:${PORT}/workingmom`;

if (!existsSync(path.join(root, ".env"))) {
  writeFileSync(
    path.join(root, ".env"),
    [
      `DATABASE_URL=${URL}`,
      `AUTH_SECRET=${randomBytes(32).toString("hex")}`,
      `FIELD_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`,
      `CRON_SECRET=${randomBytes(16).toString("hex")}`,
      "APP_URL=http://localhost:3000",
      "PAYMENT_PROVIDER=mock",
      "VIDEO_PROVIDER=mock",
      "DEV_ALLOW_EARLY_OUTCOME=1",
      "",
    ].join("\n"),
  );
  console.log("Creato .env con segreti casuali.");
}

async function main() {
  const dir = path.join(root, ".pgdata");
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "wm", password: "wm", port: PORT, persistent: true, onLog: () => {}, onError: () => {} });
  if (!existsSync(path.join(dir, "PG_VERSION"))) {
    console.log("Preparo il database locale (solo la prima volta)…");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("workingmom");
  } catch {
    /* esiste già */
  }

  const env = { ...process.env, DATABASE_URL: URL };
  const sql = postgres(URL, { onnotice: () => {} });
  const has = await sql`select to_regclass('identity.users') as t`;
  const firstRun = has[0].t === null;
  if (!firstRun) {
    const n = await sql`select count(*)::int as n from identity.users`;
    if (n[0].n === 0) await sql.end(), seed(env);
    else await sql.end();
  } else {
    await sql.end();
    console.log("Creo le tabelle e carico i dati dimostrativi…");
    const r = spawnSync("npx", ["tsx", "src/db/setup.ts"], { cwd: root, env, stdio: "inherit" });
    if (r.status !== 0) process.exit(1);
    seed(env);
  }

  console.log("\n➜ Apri http://localhost:3000   (account di prova nel README, password Demo-Password-1)\n");
  const next = spawn("npx", ["next", "dev", "-p", "3000"], { cwd: root, env, stdio: "inherit" });
  const stop = async () => {
    next.kill();
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next.on("exit", stop);
}

function seed(env: NodeJS.ProcessEnv) {
  const r = spawnSync("npx", ["tsx", "src/db/seed.ts"], { cwd: root, env: { ...env, NODE_ENV: "development" }, stdio: "inherit" });
  if (r.status !== 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
