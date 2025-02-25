import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#DCED71",
        secondary: "#1E1F24",
        tertiary: "#34414B",
      },
      fontFamily: {
        title: ["var(--font-title)"],
        button: ["var(--font-button)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
