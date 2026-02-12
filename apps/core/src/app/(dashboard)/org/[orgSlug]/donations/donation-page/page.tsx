import { getDonationPageConfig } from "./actions";
import { DonationPageForm } from "./donation-page-form";

export default async function DonationPageConfigPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const config = await getDonationPageConfig(orgSlug);

  return <DonationPageForm orgSlug={orgSlug} initialConfig={config} />;
}
