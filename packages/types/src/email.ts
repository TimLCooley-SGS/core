// ---------------------------------------------------------------------------
// Email template builder types
// ---------------------------------------------------------------------------

export type EmailBlockType =
  | "header"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "social"
  | "footer";

export interface HeaderBlockProps {
  logoUrl: string;
  logoAlt: string;
  logoWidth: number;
  title: string;
  backgroundColor: string;
  textColor: string;
  alignment: "left" | "center" | "right";
}

export interface HeadingBlockProps {
  text: string;
  level: "h1" | "h2";
  color: string;
  alignment: "left" | "center" | "right";
}

export interface TextBlockProps {
  html: string;
  color: string;
  alignment: "left" | "center" | "right";
}

export interface ImageBlockProps {
  src: string;
  alt: string;
  width: number;
  href: string;
  alignment: "left" | "center" | "right";
}

export interface ButtonBlockProps {
  text: string;
  href: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  alignment: "left" | "center" | "right";
  fullWidth: boolean;
}

export interface DividerBlockProps {
  color: string;
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  padding: number;
}

export interface SpacerBlockProps {
  height: number;
}

export interface ColumnsBlockProps {
  columns: { html: string }[];
  ratio: "50-50" | "33-67" | "67-33" | "33-33-33";
  gap: number;
}

export interface SocialBlockProps {
  alignment: "left" | "center" | "right";
  iconSize: number;
  links: {
    platform: "facebook" | "twitter" | "instagram" | "linkedin" | "youtube" | "website";
    url: string;
  }[];
}

export interface FooterBlockProps {
  html: string;
  companyName: string;
  address: string;
  color: string;
  backgroundColor: string;
  alignment: "left" | "center" | "right";
}

export type EmailBlockProps =
  | HeaderBlockProps
  | HeadingBlockProps
  | TextBlockProps
  | ImageBlockProps
  | ButtonBlockProps
  | DividerBlockProps
  | SpacerBlockProps
  | ColumnsBlockProps
  | SocialBlockProps
  | FooterBlockProps;

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  props: EmailBlockProps;
}

export interface EmailTemplateSettings {
  backgroundColor: string;
  contentWidth: number;
  fontFamily: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  settings: EmailTemplateSettings;
  html_content: string | null;
  status: "draft" | "active" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Email parameter types for transactional emails

export interface DonationReceiptParams {
  recipientEmail: string;
  recipientName: string;
  orgName: string;
  orgLogoUrl?: string;
  primaryColor?: string;
  amount: number;
  currency: string;
  donationDate: string;
  receiptNumber: string;
  taxDeductible: boolean;
}

export interface MembershipWelcomeParams {
  recipientEmail: string;
  recipientName: string;
  orgName: string;
  orgLogoUrl?: string;
  primaryColor?: string;
  planName: string;
  startDate: string;
  expiresDate?: string;
}

export interface TicketConfirmationParams {
  recipientEmail: string;
  recipientName: string;
  orgName: string;
  orgLogoUrl?: string;
  primaryColor?: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  ticketCount: number;
  confirmationNumber: string;
}
