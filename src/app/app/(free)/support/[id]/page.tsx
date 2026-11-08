import { TicketThreadView } from "@/components/SupportViews";
import { requireUser } from "@/lib/auth";

export default async function SupportThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await requireUser({ roles: ["user"] });
  return <TicketThreadView user={u} id={(await params).id} base="/app/support" sp={await searchParams} />;
}
