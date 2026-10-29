import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brutal: {
          bg: "#FFD60A", // Bright saturated yellow
          surface: "#FFF8E7", // Warm cream / off-white
          white: "#FFFEF2",
          black: "#111111",
          yellow: "#FFD60A",
          green: "#22C55E",
          amber: "#F59E0B",
          red: "#EF4444",
          gray: "#6B7280",
          cyan: "#38BDF8",
          coral: "#F43F5E",
          purple: "#A855F7",
        },
      },
      borderWidth: {
        3: "3px",
        4: "4px",
        5: "5px",
      },
      boxShadow: {
        "brutal-xs": "1.5px 1.5px 0px 0px #111111",
        "brutal-sm": "2.5px 2.5px 0px 0px #111111",
        brutal: "4px 4px 0px 0px #111111",
        "brutal-md": "5px 5px 0px 0px #111111",
        "brutal-lg": "6px 6px 0px 0px #111111",
        "brutal-xl": "8px 8px 0px 0px #111111",
        "brutal-2xl": "10px 10px 0px 0px #111111",
        "brutal-inset": "inset 3px 3px 0px 0px #111111",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
