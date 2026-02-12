// Per-organization branding and theming types

export interface OrgBranding {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  logoWideUrl?: string;
  logoSquareUrl?: string;
  faviconUrl?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
}

export type LogoVariant = "primary" | "wide" | "square" | "favicon";

/** Maps each logo variant to the OrgBranding key that stores its URL */
export const LOGO_VARIANT_KEYS: Record<LogoVariant, keyof OrgBranding> = {
  primary: "logoUrl",
  wide: "logoWideUrl",
  square: "logoSquareUrl",
  favicon: "faviconUrl",
};

/** Maps each logo variant to the filename stem used in storage */
export const LOGO_VARIANT_FILENAMES: Record<LogoVariant, string> = {
  primary: "logo",
  wide: "logo-wide",
  square: "logo-square",
  favicon: "favicon",
};

export interface PosNavItem {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_POS_NAV: PosNavItem[] = [
  { key: "home", label: "Home", visible: true, order: 0 },
  { key: "shop", label: "Shop", visible: true, order: 1 },
  { key: "tickets", label: "Tickets", visible: true, order: 2 },
  { key: "events", label: "Events", visible: true, order: 3 },
  { key: "memberships", label: "Memberships", visible: true, order: 4 },
  { key: "donations", label: "Donations", visible: true, order: 5 },
  { key: "portal", label: "Member Portal", visible: false, order: 6 },
];

export const FONT_OPTIONS = [
  { value: "system-ui, sans-serif", label: "System Default" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Lato', sans-serif", label: "Lato" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "Georgia, serif", label: "Georgia" },
] as const;

export interface OrgTheme {
  /** CSS custom property values resolved from OrgBranding + defaults */
  "--color-primary": string;
  "--color-primary-foreground": string;
  "--color-secondary": string;
  "--color-secondary-foreground": string;
  "--color-accent": string;
  "--color-accent-foreground": string;
  "--color-background": string;
  "--color-foreground": string;
  "--color-muted": string;
  "--color-muted-foreground": string;
  "--color-card": string;
  "--color-card-foreground": string;
  "--color-border": string;
  "--color-input": string;
  "--color-ring": string;
  "--color-destructive": string;
  "--color-destructive-foreground": string;
  "--font-heading": string;
  "--font-body": string;
  "--radius": string;
}

/** Default branding used when an org has no custom branding configured */
export const DEFAULT_BRANDING: OrgBranding = {
  primaryColor: "#702B9E",
  secondaryColor: "#4E2C70",
  accentColor: "#9B59B6",
  headingFont: "system-ui",
  bodyFont: "system-ui",
  borderRadius: "0.5rem",
};
