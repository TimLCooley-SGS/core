import { redirect } from "next/navigation";

export default async function MembershipsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/memberships/portal`);
}
