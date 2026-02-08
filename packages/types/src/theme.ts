// Per-organization branding and theming types

export interface OrgBranding {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  headingFont?: string;
  bodyFont?: string;
}

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
};
