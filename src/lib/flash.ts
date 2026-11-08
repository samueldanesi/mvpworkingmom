import { redirect } from "next/navigation";

/** Messaggi di esito passati via querystring: niente stato client, funziona con soli form server. */
export function back(path: string, kind: "error" | "ok", msg: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}
export const fail = (path: string, msg: string): never => back(path, "error", msg);
export const done = (path: string, msg: string): never => back(path, "ok", msg);

export function field(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}
export function fields(fd: FormData, name: string): string[] {
  return fd.getAll(name).map((v) => String(v)).filter(Boolean);
}
export function num(fd: FormData, name: string): number | undefined {
  const v = field(fd, name);
  return v === "" || Number.isNaN(Number(v)) ? undefined : Number(v);
}
