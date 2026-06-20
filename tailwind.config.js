/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App chrome — dark, high-contrast, matches manifest theme color
        bg: '#0f1115',
        panel: '#171a21',
        edge: '#262b36',
        ink: '#e7ecf3',
        muted: '#8a93a3',
        accent: '#7aa2f7',
        good: '#7bd88f',
        warn: '#f2c14e',
        danger: '#f06b6b',
      },
      fontFamily: {
        clock: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        pulse2: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse2: 'pulse2 1s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
