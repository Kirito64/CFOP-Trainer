import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./App";
import { applyStoredTheme } from "./lib/theme";
import { startBackgroundSync } from "./sync/sync";
import "./styles.css";

applyStoredTheme();
startBackgroundSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
