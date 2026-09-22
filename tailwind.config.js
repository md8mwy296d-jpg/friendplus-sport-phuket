/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '24px', lg: '48px' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      fontFamily: {
        display: ["'Bricolage Grotesque'", "'Noto Sans Thai'", 'sans-serif'],
        body: ["'Inter'", "'Noto Sans Thai'", 'sans-serif'],
        mono: ["'Space Grotesk'", "'Noto Sans Thai'", 'monospace'],
      },
      colors: {
        sand: { light: '#FBF6EC', DEFAULT: '#FBF6EC', dark: '#EADFC8' },
        shell: '#FFFFFF',
        ink: '#0B2E2B',
        lagoon: { DEFAULT: '#0E8C7F', deep: '#0A6E64', light: '#2FBFA5' },
        coral: '#FF6B4A',
        amber: '#FFB547',
        palm: '#1E5945',
        dusk: '#5B7CFF',
        confirm: '#22C55E',
        cancel: '#F05252',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        paper: "0 2px 8px rgba(11,46,43,.06), 0 16px 40px rgba(11,46,43,.08)",
        coral: "0 8px 24px rgba(255,107,74,.35)",
      },
      backgroundImage: {
        'golden-hour': 'linear-gradient(120deg, #0E8C7F 0%, #2FBFA5 35%, #FFB547 75%, #FF6B4A 100%)',
        'lagoon-deep': 'linear-gradient(180deg, #0B2E2B 0%, #1E5945 100%)',
        'coral-pop': 'linear-gradient(135deg, #FF6B4A, #FFB547)',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}