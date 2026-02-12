"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  sendTestEmail,
} from "@sgscore/api";

export async function sendTestEmailAction(
  orgSlug: string,
  templateId: string,
): Promise<{ error?: string }> {
  // Get current user email
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated or no email on account." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  // Get org's from_email from control plane
  const cp = getControlPlaneClient();
  const { data: orgData } = await cp
    .from("organizations")
    .select("from_email")
    .eq("id", org.id)
    .single();

  const fromEmail = (orgData?.from_email as string | null) ?? undefined;

  // Get template
  const tenant = getTenantClient(org);
  const { data: template } = await tenant
    .from("email_templates")
    .select("subject, html_content")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found." };
  if (!template.html_content) return { error: "Template has no rendered HTML. Open and save it first." };

  try {
    await sendTestEmail(
      template.html_content as string,
      template.subject as string,
      user.email,
      fromEmail,
    );
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send test email." };
  }
}
