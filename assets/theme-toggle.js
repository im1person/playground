// assets/theme-toggle.js
export function initThemeToggle({
  buttonId = 'themeToggle',
  localeKey = 'playground-locale',
  themeKey = 'playground-theme',
  defaultLocale = 'en',
  defaultTheme = 'light',
} = {}) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  function getLocale() {
    return localStorage.getItem(localeKey) || defaultLocale;
  }
  function getTheme() {
    return localStorage.getItem(themeKey) || defaultTheme;
  }
  function setTheme(theme) {
    localStorage.setItem(themeKey, theme);
    document.body.classList.remove('light', 'dark', 'light-mode');
    document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark');
    updateBtnText();
  }
  function updateBtnText() {
    const locale = getLocale();
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    btn.textContent =
      theme === 'light'
        ? (locale === 'en' ? '🌙 Dark Mode' : '🌙 深色模式')
        : (locale === 'en' ? '☀️ Light Mode' : '☀️ 淺色模式');
  }
  btn.addEventListener('click', () => {
    setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
  });
  window.addEventListener('storage', (event) => {
    if (event.key === themeKey) {
      setTheme(event.newValue || defaultTheme);
    }
    if (event.key === localeKey) {
      updateBtnText();
    }
  });
  // Initial setup
  setTheme(getTheme());
  updateBtnText();
} 