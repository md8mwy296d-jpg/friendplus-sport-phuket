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
        display: ["'Cormorant Garamond'", "'Noto Serif Thai'", 'serif'],
        body: ["'Manrope'", "'Noto Sans Thai'", 'sans-serif'],
        mono: ["'Space Grotesk'", "'Noto Sans Thai'", 'monospace'],
      },
      colors: {
        sand: { light: '#F7F4EE', DEFAULT: '#F7F4EE', dark: '#E4DCCF' },
        shell: '#FFFFFF',
        ink: '#15130F',
        lagoon: { DEFAULT: '#A8844A', deep: '#7D6136', light: '#D4BC8A' },
        coral: '#B08D57',
        amber: '#D9C08A',
        palm: '#2A251E',
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
        paper: "0 1px 2px rgba(21,19,15,.04), 0 18px 48px rgba(21,19,15,.07)",
        coral: "0 10px 28px rgba(21,19,15,.22)",
      },
      backgroundImage: {
        'golden-hour': 'linear-gradient(120deg, #15130F 0%, #2A251E 55%, #6B5532 100%)',
        'lagoon-deep': 'linear-gradient(180deg, #0F0E0C 0%, #1D1A16 100%)',
        'coral-pop': 'linear-gradient(135deg, #15130F, #2E2820)',
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