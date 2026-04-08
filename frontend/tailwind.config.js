/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: {
          DEFAULT: '#12121a',
          elevated: '#1a1a25',
        },
        border: '#2a2a3a',
        profit: {
          DEFAULT: '#22c55e',
          dim: '#166534',
        },
        loss: {
          DEFAULT: '#ef4444',
          dim: '#991b1b',
        },
        accent: {
          DEFAULT: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.3)',
        },
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
