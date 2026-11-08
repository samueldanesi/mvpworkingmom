/* Crea il database applicando le migrazioni. `--reset` cancella prima il file. */
import { rmSync } from "node:fs";
import { runMigrations } from "./index";

const url = process.env.DATABASE_URL ?? "file:./data/wm.db";

async function main() {
  if (process.argv.includes("--reset") && url.startsWith("file:")) {
    for (const ext of ["", "-wal", "-shm"]) rmSync(url.slice(5) + ext, { force: true });
  }
  await runMigrations();
  console.log("DB pronto.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
