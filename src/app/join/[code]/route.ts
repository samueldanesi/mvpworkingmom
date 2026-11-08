import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Link/QR di invito: ricorda il codice (non lo valida) e porta alla registrazione. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  const jar = await cookies();
  jar.set("wm_code", clean, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 * 24 * 7 });
  return NextResponse.redirect(new URL("/register", req.url));
}
