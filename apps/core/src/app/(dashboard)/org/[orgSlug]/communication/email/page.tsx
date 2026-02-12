import { getEmailTemplates } from "./actions";
import { EmailTemplatesList } from "./components/email-templates-list";

export default async function EmailPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const templates = await getEmailTemplates(orgSlug);

  return <EmailTemplatesList templates={templates} />;
}
