"use server";

import { and, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { db, payments, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { fail, field, num } from "@/lib/flash";
import { createCheckout } from "@/lib/payments";
import {
  BookingError,
  bookIntro,
  bookSessions,
  cancelAppointment,
  changeSpecialist,
  completePayments,
  continueWithSpecialist,
  failPayments,
  rescheduleAppointment,
} from "@/server/booking";

function toDate(iso: string, back: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) fail(back, "Scegli un orario.");
  return d;
}

export async function bookIntroAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const specialistId = field(fd, "specialistId");
  const back = `/app/book/${specialistId}?kind=intro`;
  let id: string;
  try {
    const a = await bookIntro(u.id, specialistId, toDate(field(fd, "start"), back));
    id = a.id;
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  redirect(`/app/appointments/${id}?ok=${encodeURIComponent("Colloquio gratuito prenotato. Ti abbiamo inviato la conferma.")}`);
}

export async function bookSessionsAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const specialistId = field(fd, "specialistId");
  const back = `/app/book/${specialistId}?kind=session`;
  const first = toDate(field(fd, "start"), back);
  const weeks = Math.min(Math.max(num(fd, "weeks") ?? 1, 1), 8);
  const [spec] = await db.select({ tz: users.timezone }).from(users).where(eq(users.id, specialistId)).limit(1);
  const starts: Date[] = [];
  for (let i = 0; i < weeks; i++) {
    starts.push(DateTime.fromJSDate(first).setZone(spec?.tz ?? "Europe/Rome").plus({ weeks: i }).toJSDate());
  }
  let res;
  try {
    res = await bookSessions(u.id, specialistId, starts);
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  if (res.pendingPaymentIds.length) {
    const rows = await db.select().from(payments).where(inArray(payments.id, res.pendingPaymentIds));
    const co = await createCheckout(
      u.email,
      rows.map((p) => ({ paymentId: p.id, description: "Consulenza Working Mom", amountCents: p.amountCents, feeCents: p.feeCents })),
    );
    redirect(co.url);
  }
  redirect(`/app/appointments?ok=${encodeURIComponent("Sedute confermate con i crediti del tuo programma.")}`);
}

export async function payAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const ids = field(fd, "ids").split(",").filter(Boolean);
  const rows = await db.select().from(payments).where(and(inArray(payments.id, ids), eq(payments.userId, u.id)));
  await completePayments(rows.map((r) => r.id), `mock_pi_${Date.now()}`);
  redirect(`/app/pay/result?ok=1&ids=${ids.join(",")}`);
}

export async function payFailAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const ids = field(fd, "ids").split(",").filter(Boolean);
  const rows = await db.select().from(payments).where(and(inArray(payments.id, ids), eq(payments.userId, u.id)));
  await failPayments(rows.map((r) => r.id), "Carta rifiutata (simulato)");
  redirect(`/app/pay/result?ok=0&ids=${ids.join(",")}`);
}

export async function cancelAppointmentAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const id = field(fd, "id");
  try {
    const r = await cancelAppointment(id, { id: u.id, role: u.role });
    redirect(`/app/appointments/${id}?ok=${encodeURIComponent(r.detail)}`);
  } catch (e) {
    if (e instanceof BookingError) fail(`/app/appointments/${id}`, e.message);
    throw e;
  }
}

export async function rescheduleAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const id = field(fd, "id");
  const back = `/app/appointments/${id}?reschedule=1`;
  try {
    await rescheduleAppointment(id, u.id, toDate(field(fd, "start"), back));
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  redirect(`/app/appointments/${id}?ok=${encodeURIComponent("Appuntamento spostato.")}`);
}

export async function continueAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  const specialistId = field(fd, "specialistId");
  try {
    await continueWithSpecialist(u.id, specialistId);
  } catch (e) {
    if (e instanceof BookingError) fail("/app/appointments", e.message);
    throw e;
  }
  redirect(`/app/book/${specialistId}?kind=session`);
}

export async function changeSpecialistAction(fd: FormData) {
  const u = await requireUser({ roles: ["user"] });
  try {
    await changeSpecialist(u.id, field(fd, "specialistId"), field(fd, "reason"));
  } catch (e) {
    if (e instanceof BookingError) fail("/app/appointments", e.message);
    throw e;
  }
  redirect(`/app/matching?ok=${encodeURIComponent("Nessun problema: ecco altre proposte. Il cambio è gratuito.")}`);
}
