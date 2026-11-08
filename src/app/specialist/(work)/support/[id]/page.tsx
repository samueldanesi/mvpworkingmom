import { TicketThreadView } from "@/components/SupportViews";
import { requireUser } from "@/lib/auth";

export default async function SpecialistSupportThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await requireUser({ roles: ["specialist"] });
  return <TicketThreadView user={u} id={(await params).id} base="/specialist/support" sp={await searchParams} />;
}
