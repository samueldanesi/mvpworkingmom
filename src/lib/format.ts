import { DateTime } from "luxon";

export const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export function fmtDateTime(d: Date | string, tz = "Europe/Rome") {
  return DateTime.fromJSDate(new Date(d)).setZone(tz).setLocale("it").toFormat("ccc d LLL yyyy, HH:mm");
}
export function fmtDate(d: Date | string, tz = "Europe/Rome") {
  return DateTime.fromJSDate(new Date(d)).setZone(tz).setLocale("it").toFormat("d LLL yyyy");
}
export function fmtTime(d: Date | string, tz = "Europe/Rome") {
  return DateTime.fromJSDate(new Date(d)).setZone(tz).toFormat("HH:mm");
}
export function fmtDay(d: Date | string, tz = "Europe/Rome") {
  return DateTime.fromJSDate(new Date(d)).setZone(tz).setLocale("it").toFormat("cccc d LLLL");
}
export const minToHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const hmToMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const WEEKDAYS = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
