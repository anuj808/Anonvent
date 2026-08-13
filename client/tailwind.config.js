/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F6F0", // Soft warm cream/off-white background
        foreground: "var(--text-primary)", // Maps default foreground to text-primary
        primary: {
          DEFAULT: "#607264", // Calming muted sage green
          hover: "#4A584D",   // Deep sage green
          light: "#EFF2EF",   // Soft mint/sage tint
          dark: "#3B473E",    // Muted dark forest green
        },
        card: {
          DEFAULT: "#FFFFFF", // Pure white card surfaces
          border: "#EAE7E1",  // Extremely soft, warm border
          darker: "#F0EDE7",  // Slightly darker warm gray stone color
        },
        text: {
          primary: "var(--text-primary)",     // Slate slate-900 equivalent (High Contrast, 13:1+)
          secondary: "var(--text-secondary)", // Deep sage charcoal (Medium Contrast, 6.2:1)
          muted: "var(--text-muted)",         // Soft dark sage gray (Low Contrast timestamp, 4.5:1 AA)
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 10px 30px -10px rgba(96, 114, 100, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.01)',
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
