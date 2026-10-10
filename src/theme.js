const THEME_STORAGE_KEY = "dream-theme";

export function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  document.documentElement.dataset.theme = nextTheme;
  window.dispatchEvent(new Event("app-theme-change"));
}
