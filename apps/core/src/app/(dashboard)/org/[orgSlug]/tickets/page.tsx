import { redirect } from "next/navigation";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/tickets/list`);
}
