import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
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

/**
 * Writes /sw.js from src/service-worker.js with the list of every built file, so the app
 * opens offline once it has loaded online. The version is a hash of all those files and the
 * worker itself, which changes sw.js whenever anything changes and makes browsers install it.
 */
function offlineApp(): Plugin {
  return {
    name: "offline-app",
    apply: "build",
    writeBundle(options) {
      if (this.environment.name !== "client" || !options.dir) return;
      const dir = options.dir;
      const hash = createHash("sha256");
      const files: string[] = [];
      for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
        const path = join(entry.parentPath, entry.name);
        const url = "/" + relative(dir, path).split("\\").join("/");
        // Dotfiles (.assetsignore) aren't served; source maps aren't needed offline.
        if (!entry.isFile() || url.split("/").some((part) => part.startsWith(".")) || url === "/sw.js" || url.endsWith(".map")) continue;
        // Cloudflare redirects /index.html to /, and browsers refuse redirected responses for pages.
        files.push(url === "/index.html" ? "/" : url);
        hash.update(url).update(readFileSync(path));
      }
      files.sort();
      const template = readFileSync(new URL("./src/service-worker.js", import.meta.url), "utf8");
      hash.update(template);
      writeFileSync(
        join(dir, "sw.js"),
        template.replace("__VERSION__", () => JSON.stringify(hash.digest("hex").slice(0, 12))).replace("__FILES__", () => JSON.stringify(files)),
      );
    },
  };
}

export default defineConfig({
  plugins: [cubingSearchWorker(), react(), tailwindcss(), cloudflare(), offlineApp()],
  // Pre-bundling would skip the plugin above and move cubing away from its worker entry.
  optimizeDeps: { exclude: ["cubing"] },
  // cubing.js runs its scramble/search code in module workers
  worker: { format: "es" },
  // cubing.js's 3D player and solver chunks are big but only load on pages that use them
  build: { chunkSizeWarningLimit: 800 },
});
