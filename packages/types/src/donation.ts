export interface DonationPageConfig {
  enabled: boolean;
  title: string;
  description: string;
  denominations: number[]; // cents, e.g. [2500, 5000, 10000]
  allowCustomAmount: boolean;
  minimumCents: number;
  maximumCents: number;
  showInTicketCheckout: boolean;
  showInEventCheckout: boolean;
  campaignName: string | null;
}

export const DEFAULT_DONATION_PAGE_CONFIG: DonationPageConfig = {
  enabled: false,
  title: "Support Our Mission",
  description:
    "Your generous donation helps us continue our work. Every contribution makes a difference.",
  denominations: [1000, 2500, 5000, 10000],
  allowCustomAmount: true,
  minimumCents: 500,
  maximumCents: 100000,
  showInTicketCheckout: false,
  showInEventCheckout: false,
  campaignName: null,
};
