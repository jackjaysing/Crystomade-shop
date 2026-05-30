/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深石墨與夜空藍調
        void: '#0a0b0f',
        graphite: '#12141c',
        slate: '#1c1f2e',
        amber: {
          glow: '#d4a574',
          deep: '#b8864a',
        },
        mystic: '#2a3a5c',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 40px rgba(212, 165, 116, 0.15)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'metal-gradient':
          'linear-gradient(135deg, rgba(212,165,116,0.4) 0%, transparent 50%, rgba(212,165,116,0.2) 100%)',
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        fadeIn: 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
