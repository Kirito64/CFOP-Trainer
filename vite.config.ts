import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // cubing.js runs its scramble/search code in module workers
  worker: { format: "es" },
  // cubing.js's 3D player and solver chunks are big but only load on pages that use them
  build: { chunkSizeWarningLimit: 800 },
});
