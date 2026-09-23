/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rover: {
          bg: '#f8fafc',        // Slate-50 clean crisp background
          card: '#ffffff',      // Pure white card background
          border: '#e2e8f0',    // Slate-200 clean border
          text: '#0f172a',      // Slate-900 high contrast dark text
          muted: '#64748b',     // Slate-500 muted text
          active: '#10b981',    // Emerald-500 active indicator
          danger: '#ef4444',    // Red-500 stop/error
          amber: '#f59e0b',     // Amber-500 mute/warning
        },
      },
    },
  },
  plugins: [],
}
