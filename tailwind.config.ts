import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        synesis: {
          primary: colors.indigo[600],
          primaryDark: colors.indigo[700],
          accent: colors.emerald[500],
          voice: colors.purple[500],
          warmth: colors.amber[400],
          rose: colors.rose[500],
          ink: colors.slate[950],
          body: colors.slate[700],
          muted: colors.slate[500],
          surface: colors.slate[50],
          card: colors.white,
          border: colors.slate[200],
        },
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        display: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: []
};

export default config;
