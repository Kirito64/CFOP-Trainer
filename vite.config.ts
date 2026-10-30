import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const WORKER_LOOKUP = 'import.meta.resolve("./search-worker-entry.js")';

/**
 * cubing.js finds its search worker with import.meta.resolve("./search-worker-entry.js"),
 * which Vite leaves alone, so the built app asks for a file that was never emitted. Point
 * it at a worker bundle Vite builds from that entry instead.
 */
function cubingSearchWorker(): Plugin {
  return {
    name: "cubing-search-worker",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/cubing/dist/") || !code.includes(WORKER_LOOKUP)) return;
      return `import __searchWorkerUrl from "./search-worker-entry.js?worker&url";\n${code.replace(WORKER_LOOKUP, "__searchWorkerUrl")}`;
    },
  };
}

export default defineConfig({
  plugins: [cubingSearchWorker(), react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      // Installed from GitHub, which has the TypeScript source but no built files: compile the source.
      "smartcube-web-bluetooth": fileURLToPath(new URL("./node_modules/smartcube-web-bluetooth/src/index.ts", import.meta.url)),
    },
  },
  // Pre-bundling would skip the plugin above and move cubing away from its worker entry.
  optimizeDeps: { exclude: ["cubing"] },
  // cubing.js runs its scramble/search code in module workers
  worker: { format: "es" },
  // cubing.js's 3D player and solver chunks are big but only load on pages that use them
  build: { chunkSizeWarningLimit: 800 },
});
