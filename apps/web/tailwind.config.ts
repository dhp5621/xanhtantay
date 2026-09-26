import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Google Sans Flex", "Google Sans", "Roboto", "system-ui", "sans-serif"],
      },
      borderRadius: {
        m3: "var(--shape-lg)",
        "m3-xl": "var(--shape-xl)",
        "m3-xxl": "var(--shape-xxl)",
      },
    },
  },
  plugins: [],
};

export default config;
