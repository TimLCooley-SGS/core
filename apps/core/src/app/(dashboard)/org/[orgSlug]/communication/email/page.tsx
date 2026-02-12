import { getEmailTemplates, getEmailFolders, getSendableLists } from "./actions";
import { EmailTemplatesList } from "./components/email-templates-list";

export default async function EmailPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [templates, folders, lists] = await Promise.all([
    getEmailTemplates(orgSlug),
    getEmailFolders(orgSlug),
    getSendableLists(orgSlug),
  ]);

  return <EmailTemplatesList templates={templates} folders={folders} lists={lists} />;
}
