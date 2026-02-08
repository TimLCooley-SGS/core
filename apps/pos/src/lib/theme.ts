import type { OrgBranding } from "@sgscore/types";

/**
 * Generates CSS custom property declarations from org branding.
 * Falls back to defaults for any missing values.
 */
export function generateThemeCSS(branding?: Partial<OrgBranding>): string {
  const primary = branding?.primaryColor ?? "#702B9E";
  const secondary = branding?.secondaryColor ?? "#4E2C70";
  const accent = branding?.accentColor ?? "#9B59B6";
  const headingFont = branding?.headingFont ?? "system-ui, sans-serif";
  const bodyFont = branding?.bodyFont ?? "system-ui, sans-serif";

  return `
    --color-primary: ${primary};
    --color-primary-foreground: #ffffff;
    --color-secondary: ${secondary};
    --color-secondary-foreground: #ffffff;
    --color-accent: ${accent};
    --color-accent-foreground: #ffffff;
    --color-ring: ${primary};
    --font-heading: ${headingFont};
    --font-body: ${bodyFont};
  `.trim();
}
