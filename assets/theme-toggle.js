// assets/theme-toggle.js
export function initThemeToggle({
  buttonId = "themeToggle",
  localeKey = "playground-locale",
  themeKey = "playground-theme",
  defaultLocale = "en",
  defaultTheme = "light",
} = {}) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const compactMedia = window.matchMedia("(max-width: 600px)");

  function getLocale() {
    return localStorage.getItem(localeKey) || defaultLocale;
  }

  function getTheme() {
    return localStorage.getItem(themeKey) || defaultTheme;
  }

  function setTheme(theme) {
    localStorage.setItem(themeKey, theme);
    document.body.classList.remove("light", "dark", "light-mode");
    document.body.classList.add(theme === "light" ? "light-mode" : "dark");
    updateBtnText();
  }

  function updateBtnText() {
    const locale = getLocale();
    const theme = document.body.classList.contains("light-mode")
      ? "light"
      : "dark";
    const isCompact = compactMedia.matches;

    if (isCompact) {
      btn.textContent = theme === "light" ? "🌙" : "☀️";
      btn.setAttribute(
        "aria-label",
        theme === "light"
          ? locale === "en"
            ? "Switch to dark mode"
            : "切換至深色模式"
          : locale === "en"
          ? "Switch to light mode"
          : "切換至淺色模式"
      );
      btn.setAttribute("title", btn.getAttribute("aria-label"));
    } else {
      btn.textContent =
        theme === "light"
          ? locale === "en"
            ? "🌙 Dark Mode"
            : "🌙 深色模式"
          : locale === "en"
          ? "☀️ Light Mode"
          : "☀️ 淺色模式";
      btn.removeAttribute("title");
      btn.setAttribute("aria-label", "Theme toggle");
    }
  }

  btn.addEventListener("click", () => {
    setTheme(document.body.classList.contains("light-mode") ? "dark" : "light");
  });

  window.addEventListener("storage", (event) => {
    if (event.key === themeKey) {
      setTheme(event.newValue || defaultTheme);
    }
    if (event.key === localeKey) {
      updateBtnText();
    }
  });

  // Listen to localechange event for same-window locale updates
  document.addEventListener("localechange", updateBtnText);

  compactMedia.addEventListener("change", updateBtnText);

  // Initial setup
  setTheme(getTheme());
  updateBtnText();
}
