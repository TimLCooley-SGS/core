import type { Config } from "tailwindcss";
import { sgsPreset } from "@sgscore/config/tailwind";

const config: Config = {
  presets: [sgsPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
