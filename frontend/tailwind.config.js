/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: { display: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      /* Ferrari palette remap: light theme -> cinematic dark #000000.
         slate-50..600 cover surfaces/borders/mid-text; 700+ handled by
         exact utility overrides in index.css (shared by text and bg). */
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: { '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))', '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))' },
        slate: {
          50: '#000000', 100: '#0d0d0d', 200: '#1a1a1a', 300: '#333333',
          400: '#8f8f8f', 500: '#b3b3b3', 600: '#7d7d7d',
        },
        gray: { 50: '#000000', 100: '#0d0d0d', 200: '#1a1a1a', 300: '#333333', 400: '#8f8f8f', 500: '#b3b3b3', 600: '#7d7d7d', 700: '#6a6a6a', 800: '#4a4a4a', 900: '#333333' },
        blue: {
          50: '#0f1400', 100: '#141b00', 200: '#1a2400', 300: '#2e4200',
          400: '#76b900', 500: '#76b900', 600: '#76b900', 700: '#5a8d00',
          800: '#476f00', 900: '#365700',
        },
        red: {
          50: '#1a0505', 100: '#240808', 200: '#2e0b0b', 300: '#5c1414',
          400: '#e52020', 500: '#e52020', 600: '#c91717', 700: '#a51212',
          800: '#830d0d', 900: '#660a0a',
        },
        amber: {
          50: '#170a02', 100: '#1f0d03', 200: '#291004', 300: '#57220a',
          400: '#df6500', 500: '#df6500', 600: '#c25300', 700: '#a04400',
          800: '#7f3600', 900: '#5f2900',
        },
        emerald: {
          50: '#0f1400', 100: '#141b00', 200: '#1a2400', 300: '#2e4200',
          400: '#76b900', 500: '#76b900', 600: '#5a8d00', 700: '#476f00',
          800: '#365700', 900: '#2a4400',
        },
        green: {
          50: '#0f1400', 100: '#141b00', 200: '#1a2400', 300: '#2e4200',
          400: '#76b900', 500: '#76b900', 600: '#5a8d00', 700: '#476f00',
          800: '#365700', 900: '#2a4400',
        },
        purple: {
          50: '#17091d', 100: '#1e0c26', 200: '#261031', 300: '#431d54',
          400: '#a44fd4', 500: '#952fc6', 600: '#7d24a8', 700: '#681d8b',
          800: '#52176e', 900: '#3d1152',
        },
        indigo: {
          50: '#17091d', 100: '#1e0c26', 200: '#261031', 300: '#431d54',
          400: '#a44fd4', 500: '#952fc6', 600: '#7d24a8', 700: '#681d8b',
          800: '#52176e', 900: '#3d1152',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
    plugins: [require("tailwindcss-animate")],
};