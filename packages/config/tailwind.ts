import type { Config } from "tailwindcss";

/**
 * SGS Core shared Tailwind preset.
 *
 * Both apps extend this. Core maps semantic tokens to SGS purple.
 * POS maps them to CSS custom properties for per-org theming.
 */
export const sgsPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Semantic tokens — each app maps these differently
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
        // SGS brand colors (always available, used in Core CRM)
        sgs: {
          "space-cadet": "#4E2C70",
          "rebecca-purple": "#702B9E",
          "light-purple": "#9B59B6",
          "pale-purple": "#D4B5E2",
          "off-white": "#FAF8FC",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default sgsPreset;
