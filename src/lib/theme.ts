export type Theme = "system" | "light" | "dark";

const KEY = "theme";

export function getTheme(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the choice still applies for this visit
  }
  applyTheme(theme);
}

function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export const applyStoredTheme = () => applyTheme(getTheme());
