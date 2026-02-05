import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration
 *
 * THEMING SYSTEM
 * - Theme colors are defined via CSS variables in globals.css
 * - Use theme-* classes for theme-aware colors (e.g., bg-theme-surface, text-theme-text)
 * - Three themes available: amber, purple (default), rain
 * - Theme is switched by applying class to <html> element
 *
 * Color tokens:
 * - theme-bg: Main background
 * - theme-surface: Card/elevated surfaces
 * - theme-border: Borders and dividers
 * - theme-primary: Primary accent/brand color
 * - theme-primary-muted: Primary hover/active states
 * - theme-text: Primary text
 * - theme-text-muted: Secondary/muted text
 * - theme-positive: Support/positive signal
 * - theme-negative: Challenge/negative signal
 * - theme-accent: Highlight accent
 * - theme-embed-bg: Embed background
 */
export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (primary system)
        "theme-bg": "var(--color-bg)",
        "theme-surface": "var(--color-surface)",
        "theme-border": "var(--color-border)",
        "theme-primary": "var(--color-primary)",
        "theme-primary-muted": "var(--color-primary-muted)",
        "theme-text": "var(--color-text)",
        "theme-text-muted": "var(--color-text-muted)",
        "theme-positive": "var(--color-positive)",
        "theme-negative": "var(--color-negative)",
        "theme-accent": "var(--color-accent)",
        "theme-embed-bg": "var(--color-embed-bg)",

        // Backward compatibility aliases
        primary: "var(--color-primary)",
        "primary-light": "var(--color-accent)",
        "primary-dark": "var(--color-primary-muted)",

        // Legacy CSS variables
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Custom spacing for consistent layout
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      // Custom container sizes
      maxWidth: {
        xs: "20rem",
        sm: "24rem",
        md: "28rem",
        lg: "32rem",
        xl: "36rem",
        "2xl": "42rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
