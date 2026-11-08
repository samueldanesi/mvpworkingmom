import { SupportIndex } from "@/components/SupportViews";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Assistenza" };

export default async function SpecialistSupport({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await requireUser({ roles: ["specialist"] });
  return <SupportIndex user={u} base="/specialist/support" sp={await searchParams} />;
}
