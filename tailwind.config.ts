import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(32 100% 98%)',
        foreground: 'hsl(24 16% 18%)',
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(24 16% 18%)',
        primary: 'hsl(28 94% 58%)',
        'primary-foreground': 'hsl(40 100% 98%)',
        secondary: 'hsl(48 100% 96%)',
        'secondary-foreground': 'hsl(24 16% 18%)',
        muted: 'hsl(45 60% 96%)',
        'muted-foreground': 'hsl(25 10% 42%)',
        border: 'hsl(35 45% 88%)',
        input: 'hsl(35 45% 88%)',
        ring: 'hsl(28 94% 58%)',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(249, 115, 22, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
