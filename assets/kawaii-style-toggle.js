/**
 * Kawaii Style Toggle
 * Toggles between default and kawaii art style
 */

const KAWAII_STORAGE_KEY = "kawaii-style-enabled";
const KAWAII_CLASS = "kawaii-mode";

/**
 * Map of image names to their kawaii versions
 */
const IMAGE_MAP = {
  "sudoku.svg": "sudoku-kawaii.svg",
  "poker.svg": "poker-kawaii.svg",
  "chess.svg": "chess-kawaii.svg",
  "tetris.svg": "tetris-kawaii.svg",
  "tetris-tspin.svg": "tetris-tspin-kawaii.svg",
  "rng.svg": "rng-kawaii.svg",
  "piano.svg": "piano-kawaii.svg",
  "falling-balls.svg": "falling-balls-kawaii.svg",
  "rubiks-cube.svg": "rubiks-cube-kawaii.svg",
  "url-parser.svg": "url-parser-kawaii.svg",
  "magic-bridge-scorer.svg": "magic-bridge-scorer-kawaii.svg",
  "secret-santa.svg": "secret-santa-kawaii.svg",
  "christmas-countdown.svg": "christmas-countdown-kawaii.svg",
  "christmas-tree.svg": "christmas-tree-kawaii.svg",
  "advent-calendar.svg": "advent-calendar-kawaii.svg",
  "gift-list.svg": "gift-list-kawaii.svg",
  "snowflake-puzzle.svg": "snowflake-puzzle-kawaii.svg",
  "lunar-new-year-countdown.svg": "lunar-new-year-countdown-kawaii.svg",
  "red-envelope-calculator.svg": "red-envelope-calculator-kawaii.svg",
  "spring-couplet-generator.svg": "spring-couplet-generator-kawaii.svg",
  "zodiac-memory.svg": "zodiac-memory-kawaii.svg",
  "spring-couplet-match.svg": "spring-couplet-match-kawaii.svg",
  "reunion-dinner.svg": "reunion-dinner-kawaii.svg",
  "lantern-riddle.svg": "lantern-riddle-kawaii.svg",
};

/**
 * Swap images based on kawaii mode
 */
function swapImages(isKawaiiMode) {
  const images = document.querySelectorAll('img[src*="assets/images/"]');
  images.forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;

    // Extract image filename
    const match = src.match(/assets\/images\/([^/]+)$/);
    if (!match) return;

    const filename = match[1];

    if (isKawaiiMode) {
      // Switch to kawaii version
      if (IMAGE_MAP[filename]) {
        const kawaiiSrc = src.replace(filename, IMAGE_MAP[filename]);
        img.setAttribute("data-original-src", src);
        img.setAttribute("src", kawaiiSrc);
      }
    } else {
      // Switch back to original
      const originalSrc = img.getAttribute("data-original-src");
      if (originalSrc) {
        img.setAttribute("src", originalSrc);
        img.removeAttribute("data-original-src");
      }
    }
  });
}

/**
 * Initialize the kawaii style toggle
 */
export function initKawaiiStyleToggle() {
  const toggleBtn = document.getElementById("kawaiiStyleToggle");
  if (!toggleBtn) {
    console.warn("Kawaii style toggle button not found");
    return;
  }

  // Load saved preference
  const savedPreference = localStorage.getItem(KAWAII_STORAGE_KEY);
  const isEnabled = savedPreference === "true";

  // Apply initial state
  if (isEnabled) {
    document.documentElement.classList.add(KAWAII_CLASS);
    toggleBtn.setAttribute("aria-pressed", "true");
    toggleBtn.title = "Disable Kawaii Style";
    swapImages(true);
  } else {
    document.documentElement.classList.remove(KAWAII_CLASS);
    toggleBtn.setAttribute("aria-pressed", "false");
    toggleBtn.title = "Enable Kawaii Style";
    swapImages(false);
  }

  // Toggle on click
  toggleBtn.addEventListener("click", () => {
    const isCurrentlyEnabled =
      document.documentElement.classList.contains(KAWAII_CLASS);

    if (isCurrentlyEnabled) {
      document.documentElement.classList.remove(KAWAII_CLASS);
      localStorage.setItem(KAWAII_STORAGE_KEY, "false");
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.title = "Enable Kawaii Style";
      swapImages(false);
    } else {
      document.documentElement.classList.add(KAWAII_CLASS);
      localStorage.setItem(KAWAII_STORAGE_KEY, "true");
      toggleBtn.setAttribute("aria-pressed", "true");
      toggleBtn.title = "Disable Kawaii Style";
      swapImages(true);
    }
  });
}
