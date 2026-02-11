import type { Config } from "tailwindcss";
import { sgsPreset } from "@sgscore/config/tailwind";
import typography from "@tailwindcss/typography";

const config: Config = {
  presets: [sgsPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [typography],
};

export default config;
