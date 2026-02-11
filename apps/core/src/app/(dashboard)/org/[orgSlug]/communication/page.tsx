import { redirect } from "next/navigation";

export default async function CommunicationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/org/${orgSlug}/communication/email`);
}
