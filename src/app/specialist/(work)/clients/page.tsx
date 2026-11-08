import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { myClients } from "@/server/specialist";

export const metadata = { title: "I miei utenti" };

const LABEL: Record<string, [string, "gray" | "green" | "blue" | "amber" | "red"]> = {
  intro_booked: ["Colloquio fissato", "blue"],
  intro_done: ["Colloquio fatto", "amber"],
  active: ["In corso", "green"],
  changed: ["Ha cambiato specialista", "gray"],
  interrupted: ["Interrotto", "red"],
  ended: ["Concluso", "gray"],
};

/** S-05: solo i propri utenti, con stato del percorso. */
export default async function Clients() {
  const u = await requireUser({ roles: ["specialist"] });
  const rows = await myClients(u.id);
  return (
    <>
      <PageHeader title="I miei utenti" />
      {rows.length === 0 ? <Empty>Ancora nessun utente.</Empty> : (
        <Card className="p-0">
          <table>
            <thead><tr><th>Nome</th><th>Stato</th><th>Ultimo aggiornamento</th></tr></thead>
            <tbody>{rows.map(({ rel, name }) => { const [l, t] = LABEL[rel.status]; return <tr key={rel.id}><td>{name}</td><td><Badge tone={t}>{l}</Badge></td><td>{fmtDate(rel.updatedAt, u.timezone)}</td></tr>; })}</tbody>
          </table>
        </Card>
      )}
    </>
  );
}
