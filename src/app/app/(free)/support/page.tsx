import { SupportIndex } from "@/components/SupportViews";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Assistenza" };

export default async function Support({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await requireUser({ roles: ["user"] });
  return <SupportIndex user={u} base="/app/support" sp={await searchParams} />;
}
