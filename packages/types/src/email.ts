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
