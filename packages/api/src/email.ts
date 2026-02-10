import sgMail from "@sendgrid/mail";
import type {
  DonationReceiptParams,
  MembershipWelcomeParams,
  TicketConfirmationParams,
} from "@sgscore/types/email";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let initialized = false;

function initEmail(): void {
  if (initialized) return;
  // Strip any non-printable / invisible characters (common when pasting into env var UIs)
  const apiKey = process.env.SENDGRID_API_KEY?.replace(/[^\x20-\x7E]/g, "");
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is not set");
  }
  sgMail.setApiKey(apiKey);
  initialized = true;
}

function getFromEmail(): string {
  return process.env.SENDGRID_FROM_EMAIL ?? "noreply@sgscore.com";
}

// ---------------------------------------------------------------------------
// Low-level send
// ---------------------------------------------------------------------------

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  initEmail();
  try {
    await sgMail.send({
      to: options.to,
      from: getFromEmail(),
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });
  } catch (err: unknown) {
    // Extract detailed error from SendGrid response
    const sgErr = err as { response?: { body?: { errors?: { message: string; field?: string }[] } } };
    const details = sgErr.response?.body?.errors
      ?.map((e) => e.field ? `${e.field}: ${e.message}` : e.message)
      .join("; ");
    throw new Error(details || (err instanceof Error ? err.message : "SendGrid error"));
  }
}

// ---------------------------------------------------------------------------
// Shared email layout
// ---------------------------------------------------------------------------

function emailLayout(
  orgName: string,
  logoUrl: string | undefined,
  primaryColor: string,
  bodyHtml: string,
): string {
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:48px;margin-bottom:16px;" />`
    : `<h2 style="margin:0 0 16px;color:${primaryColor};">${orgName}</h2>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:24px 32px;background:${primaryColor};text-align:center;">
          ${logoBlock}
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center;">
          Sent by ${orgName} via <a href="https://sgscore.com" style="color:${primaryColor};text-decoration:none;">SGS Core</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const DEFAULT_COLOR = "#702B9E";

// ---------------------------------------------------------------------------
// Donation Receipt
// ---------------------------------------------------------------------------

export async function sendDonationReceipt(
  params: DonationReceiptParams,
): Promise<void> {
  const color = params.primaryColor ?? DEFAULT_COLOR;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency,
  }).format(params.amount);

  const taxNote = params.taxDeductible
    ? `<p style="margin:16px 0 0;font-size:13px;color:#666;">This donation may be tax-deductible. No goods or services were provided in exchange for this contribution. Please retain this receipt for your records.</p>`
    : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${color};">Thank you for your donation!</h1>
    <p style="margin:0 0 24px;color:#555;">Dear ${params.recipientName},</p>
    <p style="margin:0 0 16px;">Thank you for your generous donation to <strong>${params.orgName}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e5e5;border-radius:6px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Amount</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right;">${formattedAmount}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Date</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;">${params.donationDate}</td></tr>
      <tr><td style="padding:12px 16px;font-size:13px;color:#666;">Receipt #</td>
          <td style="padding:12px 16px;text-align:right;font-family:monospace;">${params.receiptNumber}</td></tr>
    </table>
    ${taxNote}`;

  const html = emailLayout(params.orgName, params.orgLogoUrl, color, body);

  await sendEmail({
    to: params.recipientEmail,
    subject: `Donation Receipt from ${params.orgName}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Membership Welcome
// ---------------------------------------------------------------------------

export async function sendMembershipWelcome(
  params: MembershipWelcomeParams,
): Promise<void> {
  const color = params.primaryColor ?? DEFAULT_COLOR;

  const expiresRow = params.expiresDate
    ? `<tr><td style="padding:12px 16px;font-size:13px;color:#666;">Expires</td>
          <td style="padding:12px 16px;text-align:right;">${params.expiresDate}</td></tr>`
    : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${color};">Welcome, ${params.recipientName}!</h1>
    <p style="margin:0 0 24px;color:#555;">Your membership with <strong>${params.orgName}</strong> is now active.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e5e5;border-radius:6px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Plan</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right;">${params.planName}</td></tr>
      <tr><td style="padding:12px 16px;${params.expiresDate ? "border-bottom:1px solid #e5e5e5;" : ""}font-size:13px;color:#666;">Start Date</td>
          <td style="padding:12px 16px;${params.expiresDate ? "border-bottom:1px solid #e5e5e5;" : ""}text-align:right;">${params.startDate}</td></tr>
      ${expiresRow}
    </table>
    <p style="margin:16px 0 0;color:#555;">We're glad to have you as a member. If you have any questions, don't hesitate to reach out.</p>`;

  const html = emailLayout(params.orgName, params.orgLogoUrl, color, body);

  await sendEmail({
    to: params.recipientEmail,
    subject: `Welcome to ${params.orgName}!`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Ticket Confirmation
// ---------------------------------------------------------------------------

export async function sendTicketConfirmation(
  params: TicketConfirmationParams,
): Promise<void> {
  const color = params.primaryColor ?? DEFAULT_COLOR;

  const locationRow = params.eventLocation
    ? `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Location</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;">${params.eventLocation}</td></tr>`
    : "";

  const ticketLabel = params.ticketCount === 1 ? "1 ticket" : `${params.ticketCount} tickets`;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:${color};">Your Tickets Are Confirmed!</h1>
    <p style="margin:0 0 24px;color:#555;">Dear ${params.recipientName},</p>
    <p style="margin:0 0 16px;">You're all set for <strong>${params.eventName}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e5e5;border-radius:6px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Event</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right;">${params.eventName}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Date</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;">${params.eventDate}</td></tr>
      ${locationRow}
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666;">Tickets</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;text-align:right;">${ticketLabel}</td></tr>
      <tr><td style="padding:12px 16px;font-size:13px;color:#666;">Confirmation #</td>
          <td style="padding:12px 16px;text-align:right;font-family:monospace;">${params.confirmationNumber}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#555;">Please save this email as your confirmation. See you there!</p>`;

  const html = emailLayout(params.orgName, params.orgLogoUrl, color, body);

  await sendEmail({
    to: params.recipientEmail,
    subject: `Ticket Confirmation: ${params.eventName}`,
    html,
  });
}
