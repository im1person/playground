// assets/locale-menu.js
export function initLocaleMenu({
  selectId = 'localeSelect',
  localeKey = 'playground-locale',
  defaultLocale = 'en',
  onLocaleChange = null,
} = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;

  function setLocale(locale) {
    localStorage.setItem(localeKey, locale);
    document.documentElement.lang = locale;
    select.value = locale;
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = el.getAttribute('data-' + locale) || el.getAttribute('data-en');
    });
    if (typeof onLocaleChange === 'function') onLocaleChange(locale);
  }

  const savedLocale = localStorage.getItem(localeKey) || defaultLocale;
  setLocale(savedLocale);

  select.addEventListener('change', e => setLocale(e.target.value));
  window.addEventListener('storage', (event) => {
    if (event.key === localeKey) {
      setLocale(event.newValue || defaultLocale);
    }
  });

  return setLocale;
} 