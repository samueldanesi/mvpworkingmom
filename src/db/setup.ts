/* Crea gli schemi e le tabelle. `--reset` svuota tutto prima. */
import { execSync } from "node:child_process";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://wm:wm@localhost:5432/workingmom";
const reset = process.argv.includes("--reset");

async function main() {
  const sql = postgres(url, { onnotice: () => {} });
  for (const s of ["identity", "clinical", "analytics", "keys"]) {
    if (reset) await sql.unsafe(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${s}`);
  }
  await sql.end();
  execSync("npx drizzle-kit push --force", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  const sql2 = postgres(url, { onnotice: () => {} });
  await sql2.unsafe("CREATE SEQUENCE IF NOT EXISTS identity.invoice_seq START 1");
  await sql2.end();
  console.log("DB pronto.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
