/**
 * Avvio locale in un solo comando:  npm run local
 * Crea .env con segreti casuali se manca, prepara il database SQLite (data/wm.db) con i dati
 * dimostrativi al primo avvio, e lancia l'app su http://localhost:3000.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  console.error(`\n✋ Hai Node ${process.versions.node}: serve la versione 20 o più recente (consigliata la 22).\n`);
  console.error("   Con conda:  conda create -n wm -c conda-forge nodejs=22 -y && conda activate wm");
  console.error("   Con nvm:    nvm install 22 && nvm use 22");
  console.error("   Con brew:   brew install node@22\n");
  console.error("   Poi:        rm -rf node_modules && npm install && npm run local\n");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

if (!existsSync(path.join(root, ".env"))) {
  writeFileSync(
    path.join(root, ".env"),
    [
      "DATABASE_URL=file:./data/wm.db",
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

const dbFile = path.join(root, "data", "wm.db");
if (!existsSync(dbFile)) {
  console.log("Prima esecuzione: creo il database e carico i dati dimostrativi…");
  const r = spawnSync("npm", ["run", "db:reset"], { cwd: root, stdio: "inherit", env: { ...process.env, NODE_ENV: "development" } });
  if (r.status !== 0) process.exit(1);
}

console.log("\n➜ Apri http://localhost:3000   (account di prova nel README, password Demo-Password-1)\n");
const next = spawn("npx", ["next", "dev", "-p", "3000"], { cwd: root, stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => next.kill());
