// assets/locale-menu.js — Target base: Hong Kong (zh-HK)
export function initLocaleMenu({
  selectId = "localeSelect",
  toggleButtonId = "localeToggleBtn",
  localeKey = "playground-locale",
  defaultLocale = "zh-HK",
  onLocaleChange = null,
} = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const toggleBtn = document.getElementById(toggleButtonId);

  const localeLabels = {
    en: "EN",
    "zh-HK": "中文",
    "zh-Hant": "中文",
  };

  function updateToggleBtn(locale) {
    if (!toggleBtn) return;
    toggleBtn.textContent = localeLabels[locale] || "Lang";
    const ariaLabel = locale === "en" ? "Switch to Chinese" : "Switch to English";
    toggleBtn.setAttribute("aria-label", ariaLabel);
    toggleBtn.setAttribute("title", ariaLabel);
  }

  function getLocalizedContent(el, locale) {
    const attr = "data-" + locale;
    return el.getAttribute(attr) ?? el.getAttribute("data-zh-Hant") ?? el.getAttribute("data-en");
  }

  function setLocale(locale) {
    localStorage.setItem(localeKey, locale);
    document.documentElement.lang = locale === "zh-HK" ? "zh-HK" : locale;
    select.value = locale;
    document.querySelectorAll("[data-en]").forEach((el) => {
      const content = getLocalizedContent(el, locale);
      if (content != null) el.innerHTML = content;
    });
    document.querySelectorAll("[data-placeholder-en]").forEach((el) => {
      const attr = "data-placeholder-" + locale;
      const placeholder = el.getAttribute(attr) ?? el.getAttribute("data-placeholder-zh-Hant") ?? el.getAttribute("data-placeholder-en");
      if (placeholder != null) el.placeholder = placeholder;
    });
    updateToggleBtn(locale);
    document.dispatchEvent(new CustomEvent("localechange", { detail: { locale } }));
    if (typeof onLocaleChange === "function") onLocaleChange(locale);
  }

  const savedLocale = localStorage.getItem(localeKey) || defaultLocale;
  setLocale(savedLocale);

  select.addEventListener("change", (e) => setLocale(e.target.value));
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const nextLocale = select.value === "en" ? "zh-HK" : "en";
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
