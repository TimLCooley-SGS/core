import { notFound } from "next/navigation";
import { getEmailTemplate } from "../actions";
import { EmailBuilder } from "../components/email-builder";

export default async function EditEmailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; templateId: string }>;
}) {
  const { orgSlug, templateId } = await params;
  const template = await getEmailTemplate(orgSlug, templateId);

  if (!template) notFound();

  return (
    <EmailBuilder
      templateId={templateId}
      initialData={{
        name: template.name,
        subject: template.subject,
        preheader: template.preheader,
        blocks: template.blocks,
        settings: template.settings,
      }}
    />
  );
}
