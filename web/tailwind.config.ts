import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/styles/**/*.{ts,tsx}", "./src/**/*.mdx"],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
