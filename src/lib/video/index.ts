import { env } from "@/lib/env";

/**
 * U-09 / P-07 / T-04: fornitore video con server in UE, senza registrazione.
 * - mock   : pagina interna /call/[id] con anteprima camera (per sviluppo e collaudo senza account)
 * - whereby: Whereby Embedded (server UE, GDPR). NON testato con chiavi reali.
 */
export type Room = { provider: string; roomUrl: string; hostUrl: string };

export async function createRoom(a: { id: string; startsAt: Date; endsAt: Date }): Promise<Room> {
  if (env.videoProvider === "whereby" && process.env.WHEREBY_API_KEY) {
    const res = await fetch("https://api.whereby.dev/v1/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHEREBY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        isLocked: true,
        roomNamePrefix: "wm",
        roomMode: "normal",
        startDate: a.startsAt.toISOString(),
        endDate: new Date(a.endsAt.getTime() + 30 * 60_000).toISOString(),
        fields: ["hostRoomUrl"],
        recording: { type: "none" }, // P-07: nessuna registrazione
      }),
    });
    if (!res.ok) throw new Error(`Whereby: ${res.status}`);
    const j = (await res.json()) as { roomUrl: string; hostRoomUrl: string };
    return { provider: "whereby", roomUrl: j.roomUrl, hostUrl: j.hostRoomUrl };
  }
  const url = `${env.appUrl}/call/${a.id}`;
  return { provider: "mock", roomUrl: url, hostUrl: url };
}
