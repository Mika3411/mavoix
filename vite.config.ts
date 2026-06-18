import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version?: string };

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __MA_VOIX_APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0"),
  },
  build: {
    outDir: "build",
  },
});
