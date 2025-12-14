// assets/locale-menu.js
export function initLocaleMenu({
  selectId = "localeSelect",
  toggleButtonId = "localeToggleBtn",
  localeKey = "playground-locale",
  defaultLocale = "en",
  onLocaleChange = null,
} = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const toggleBtn = document.getElementById(toggleButtonId);

  const localeLabels = {
    en: "EN",
    "zh-Hant": "中文",
  };

  function updateToggleBtn(locale) {
    if (!toggleBtn) return;
    toggleBtn.textContent = localeLabels[locale] || "Lang";
    const ariaLabel = locale === "en" ? "Switch to Chinese" : "切換成英文";
    toggleBtn.setAttribute("aria-label", ariaLabel);
    toggleBtn.setAttribute("title", ariaLabel);
  }

  function setLocale(locale) {
    localStorage.setItem(localeKey, locale);
    document.documentElement.lang = locale;
    select.value = locale;
    document.querySelectorAll("[data-en]").forEach((el) => {
      el.innerHTML =
        el.getAttribute("data-" + locale) || el.getAttribute("data-en");
    });
    updateToggleBtn(locale);
    // Dispatch localechange event for other components to listen to
    document.dispatchEvent(new CustomEvent("localechange", { detail: { locale } }));
    if (typeof onLocaleChange === "function") onLocaleChange(locale);
  }

  const savedLocale = localStorage.getItem(localeKey) || defaultLocale;
  setLocale(savedLocale);

  select.addEventListener("change", (e) => setLocale(e.target.value));
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const nextLocale = select.value === "en" ? "zh-Hant" : "en";
      setLocale(nextLocale);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === localeKey) {
      setLocale(event.newValue || defaultLocale);
    }
  });

  return setLocale;
}
