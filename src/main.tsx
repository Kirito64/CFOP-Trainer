import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./App";
import { applyStoredTheme } from "./lib/theme";
import { startBackgroundSync } from "./sync/sync";
import "./styles.css";

applyStoredTheme();
startBackgroundSync();

// Cache the app so it opens with no internet (see src/service-worker.js), and ask the browser
// not to clear this site's data, which holds every solve until it syncs.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
void navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
