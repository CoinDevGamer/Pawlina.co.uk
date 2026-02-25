export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      heading: ['"Outfit"', 'sans-serif'],
    },
    extend: {
      colors: {
        brand: {
          50: '#fdfaef',
          100: '#f9f1d6',
          200: '#f4e3b1',
          300: '#edd185',
          400: '#e5ba55',
          500: '#dfa233',
          600: '#d18627',
          700: '#b06523',
          800: '#8d4f21',
          900: '#72411e',
        },
        surface: {
          50: 'rgb(var(--surface-50) / <alpha-value>)',
          100: 'rgb(var(--surface-100) / <alpha-value>)',
          200: 'rgb(var(--surface-200) / <alpha-value>)',
          300: 'rgb(var(--surface-300) / <alpha-value>)',
          400: 'rgb(var(--surface-400) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          light: 'rgb(var(--ink-light) / <alpha-value>)',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(94, 84, 74, 0.05)',
        'float': '0 12px 30px -4px rgba(94, 84, 74, 0.08), 0 4px 10px -2px rgba(94, 84, 74, 0.04)',
        'float-lg': '0 20px 40px -8px rgba(94, 84, 74, 0.12), 0 10px 20px -4px rgba(94, 84, 74, 0.06)',
        'glow': '0 0 20px rgba(223, 162, 51, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
  },
  plugins: []
}
