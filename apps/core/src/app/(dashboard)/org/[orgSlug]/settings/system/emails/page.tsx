import { getFromEmail } from "./actions";
import { EmailSettingsForm } from "./email-settings-form";

export default async function EmailSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const fromEmail = await getFromEmail(orgSlug);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Email Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure outgoing email settings for your organization.
        </p>
      </div>
      <EmailSettingsForm initialFromEmail={fromEmail} />
    </div>
  );
}
