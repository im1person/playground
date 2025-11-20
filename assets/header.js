/**
 * Creates and returns a reusable header component
 * @param {string} homePath - Path to the home/index page (e.g., '../../index.html' for games, 'index.html' for root)
 * @returns {HTMLElement} The header element
 */
export function createHeader(homePath = "index.html") {
  const header = document.createElement("div");
  header.className = "top-bar";
  header.innerHTML = `
    <a href="${homePath}" class="home-btn" aria-label="Home" title="Home">🏠</a>
    <select id="localeSelect" class="locale-select">
      <option value="en">English</option>   
      <option value="zh-Hant">繁體中文</option>
    </select>
    <button id="themeToggle" class="theme-toggle"></button>
  `;
  return header;
}

/**
 * Initializes the header by injecting it into the page
 * @param {string} homePath - Path to the home/index page
 * @param {string} insertBefore - Selector for element to insert before (default: 'body > *:first-child')
 */
export function initHeader(
  homePath = "index.html",
  insertBefore = "body > *:first-child"
) {
  const header = createHeader(homePath);
  const targetElement = document.querySelector(insertBefore);
  if (targetElement) {
    targetElement.parentNode.insertBefore(header, targetElement);
  } else {
    // Fallback: insert at the beginning of body
    if (document.body.firstChild) {
      document.body.insertBefore(header, document.body.firstChild);
    } else {
      document.body.appendChild(header);
    }
  }
  return header;
}
