import { redirect } from "next/navigation";

export default async function DonationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/donations/overview`);
}
