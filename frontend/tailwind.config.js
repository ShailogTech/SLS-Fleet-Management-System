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
      /* Ferrari palette remap: light theme -> cinematic dark #181818.
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
          50: '#181818', 100: '#1d1d1d', 200: '#303030', 300: '#3a3a3a',
          400: '#8f8f8f', 500: '#969696', 600: '#7d7d7d',
        },
        gray: { 50: '#181818', 100: '#1d1d1d', 200: '#303030', 300: '#3a3a3a', 400: '#8f8f8f', 500: '#969696', 600: '#7d7d7d', 700: '#6a6a6a', 800: '#4a4a4a', 900: '#3a3a3a' },
        blue: {
          50: '#1f1210', 100: '#2a1614', 200: '#331a17', 300: '#5a2b25',
          400: '#c43a2e', 500: '#da291c', 600: '#da291c', 700: '#b01e0a',
          800: '#8c170b', 900: '#731408',
        },
        red: {
          50: '#2a1310', 100: '#331815', 200: '#3d1c18', 300: '#6b2a24',
          400: '#c23328', 500: '#f13a2c', 600: '#d92c1d', 700: '#b02417',
          800: '#8c1c13', 900: '#6b150e',
        },
        amber: {
          50: '#2a1512', 100: '#331a17', 200: '#3d1f1b', 300: '#6b2a24',
          400: '#a83328', 500: '#f13a2c', 600: '#e02415', 700: '#b81f12',
          800: '#8f180e', 900: '#6d120b',
        },
        emerald: {
          50: '#0e2018', 100: '#122a1f', 200: '#1a3a2a', 300: '#1f4d36',
          400: '#03904a', 500: '#03904a', 600: '#037a3e', 700: '#026231',
          800: '#024b26', 900: '#01391c',
        },
        green: {
          50: '#0e2018', 100: '#122a1f', 200: '#1a3a2a', 300: '#1f4d36',
          400: '#03904a', 500: '#03904a', 600: '#037a3e', 700: '#026231',
          800: '#024b26', 900: '#01391c',
        },
        purple: {
          50: '#12202a', 100: '#162631', 200: '#1b2d3a', 300: '#2a4a5e',
          400: '#4c98b9', 500: '#4c98b9', 600: '#3f7f9b', 700: '#356a83',
          800: '#2b566a', 900: '#224453',
        },
        indigo: {
          50: '#12202a', 100: '#162631', 200: '#1b2d3a', 300: '#2a4a5e',
          400: '#4c98b9', 500: '#4c98b9', 600: '#3f7f9b', 700: '#356a83',
          800: '#2b566a', 900: '#224453',
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