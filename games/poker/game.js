/**
 * Main game logic for playing card simulation
 */

import { Card, Deck } from "./card-engine.js";
import { renderDeck, renderHand, flipCard, animateFlip } from "./card-ui.js";

// Game state
let deck = null;
let dealtCards = [];
let layoutMode = "normal"; // normal | hand | arc

// DOM elements - will be initialized after DOM loads
let deckDisplay = null;
let deckCount = null;
let dealtCardsContainer = null;
let shuffleBtn = null;
let dealBtn = null;
let resetBtn = null;
let dealCountInput = null;
let layoutModeBtn = null;

/**
 * Initialize the game
 */
function initGame() {
  try {
    console.log("Initializing game...");
    console.log("deckDisplay:", deckDisplay);
    console.log("deckCount:", deckCount);
    console.log("dealtCardsContainer:", dealtCardsContainer);

    // Create new deck
    deck = new Deck();
    console.log("Deck created, count:", deck.getCount());
    deck.shuffle();
    dealtCards = [];

    // Update UI
    console.log("Updating deck display...");
    updateDeckDisplay();
    updateDealtCards();
    updateDeckCount();
    console.log("Game initialized successfully");
  } catch (error) {
    console.error("Error initializing game:", error);
    console.error(error.stack);
  }
}

/**
 * Update deck display
 */
function updateDeckDisplay() {
  if (!deck) {
    console.warn("Deck not initialized");
    return;
  }
  if (!deckDisplay) {
    console.warn("deckDisplay element not found");
    deckDisplay = document.getElementById("deckDisplay");
    if (!deckDisplay) {
      console.error("Still cannot find deckDisplay element!");
      return;
    }
  }
  console.log("Rendering deck to container:", deckDisplay);
  renderDeck(deck, deckDisplay);
}

/**
 * Update dealt cards display
 */
function updateDealtCards() {
  if (!dealtCardsContainer) {
    console.error("dealtCardsContainer not found");
    return;
  }

  if (!Array.isArray(dealtCards)) {
    console.error("dealtCards is not an array", dealtCards);
    return;
  }

  const isArc = layoutMode === "arc";
  const isHand = layoutMode === "hand";

  dealtCardsContainer.classList.toggle("arc-mode", isArc);
  dealtCardsContainer.classList.toggle("hand-mode", isHand);

  renderHand(dealtCards, dealtCardsContainer, true);

  if (isArc) {
    requestAnimationFrame(() => applyArcLayout());
  } else if (!isArc) {
    resetCardLayout();
  }

  const cardElements = dealtCardsContainer.querySelectorAll(".card");
  cardElements.forEach((cardEl) => {
    cardEl.addEventListener("click", () => {
      animateFlip(cardEl);
      setTimeout(() => flipCard(cardEl), 150);
    });

    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        animateFlip(cardEl);
        setTimeout(() => flipCard(cardEl), 150);
      }
    });
  });
}

/**
 * Update deck count display
 */
function updateDeckCount() {
  if (!deck || !deckCount) return;
  const count = deck.getCount();
  const locale = document.documentElement.lang || "en";
  const text = locale === "zh-Hant" ? `剩餘: ${count}` : `Cards: ${count}`;
  deckCount.textContent = text;
  deckCount.setAttribute("data-en", `Cards: ${count}`);
  deckCount.setAttribute("data-zh-Hant", `剩餘: ${count}`);
}

/**
 * Handle shuffle button click
 */
function handleShuffle() {
  if (!deck) return;
  if (deck.isEmpty()) {
    // If deck is empty, reset first
    initGame();
    return;
  }

  deck.shuffle();
  updateDeckDisplay();

  // Add shuffle animation
  if (deckDisplay) {
    const deckVisual = deckDisplay.querySelector(".deck-visual");
    if (deckVisual) {
      deckVisual.style.animation = "none";
      setTimeout(() => {
        deckVisual.style.animation = "shuffleAnimation 0.5s ease-in-out";
      }, 10);
    }
  }
}

/**
 * Handle deal button click
 */
function handleDeal() {
  if (!deck || !dealCountInput) return;
  const count = parseInt(dealCountInput.value) || 1;

  if (deck.isEmpty()) {
    alert("Deck is empty! Click Reset to create a new deck.");
    return;
  }

  const cardsToDeal = Math.min(count, deck.getCount());
  const newCards = deck.deal(cardsToDeal);

  // Add new cards to dealt cards
  dealtCards.push(...newCards);

  // Update UI - cards will appear in normal layout first
  updateDeckDisplay();
  updateDealtCards();
  updateDeckCount();

  // Arc layout will be applied after deal animation completes (handled in updateDealtCards)
}

/**
 * Handle reset button click
 */
function handleReset() {
  // Return all dealt cards to deck
  deck.reset();
  deck.shuffle();
  dealtCards = [];

  // Update UI
  updateDeckDisplay();
  updateDealtCards();
  updateDeckCount();
}

function handleLayoutModeToggle() {
  const modes = ["normal", "hand", "arc"];
  const currentIndex = modes.indexOf(layoutMode);
  layoutMode = modes[(currentIndex + 1) % modes.length];

  updateDealtCards();

  if (layoutMode === "arc" && dealtCards.length > 0) {
    requestAnimationFrame(() => applyArcLayout());
  } else if (layoutMode === "normal") {
    resetCardLayout();
  }

  updateLayoutModeButton();
}

function updateLayoutModeButton() {
  if (!layoutModeBtn) return;
  const locale = document.documentElement.lang || "en";
  let textEn = "Normal Mode";
  let textZh = "正常模式";

  if (layoutMode === "hand") {
    textEn = "Spread Mode";
    textZh = "展開模式";
  } else if (layoutMode === "arc") {
    textEn = "Arc Mode";
    textZh = "扇形模式";
  }

  layoutModeBtn.setAttribute("data-en", textEn);
  layoutModeBtn.setAttribute("data-zh-Hant", textZh);
  layoutModeBtn.textContent = locale === "zh-Hant" ? textZh : textEn;
  layoutModeBtn.classList.toggle("active", layoutMode !== "normal");
}

/**
 * Apply arc/fan layout to cards with overlapping effect
 */
function applyArcLayout() {
  if (!dealtCardsContainer) return;

  const cards = dealtCardsContainer.querySelectorAll(".card");
  const cardCount = cards.length;
  if (cardCount === 0) return;

  const maxAngle = 85;
  const totalAngle = Math.min(cardCount * 12, maxAngle);
  const startAngle = -totalAngle / 2;
  const angleStep = totalAngle / Math.max(cardCount - 1, 1);

  const containerWidth = dealtCardsContainer.clientWidth || 800;
  const centerX = containerWidth / 2;
  const cardWidth = 80;
  const overlap = 30;
  const totalWidth = cardCount * cardWidth - (cardCount - 1) * overlap;
  const startX = centerX - totalWidth / 2;

  cards.forEach((card, index) => {
    card.style.animation = "none";
    card.style.opacity = "1";
    const angle = startAngle + angleStep * index;
    const angleRad = (angle * Math.PI) / 180;
    const lift = Math.abs(Math.sin(angleRad)) * 35;
    const x = startX + index * (cardWidth - overlap);

    card.style.position = "absolute";
    card.style.left = `${x}px`;
    card.style.bottom = "0px";
    card.style.transform = `translateY(${-lift}px) rotate(${angle}deg)`;
    card.style.transformOrigin = "center bottom";
    card.style.transition =
      "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.45s ease-out";
    card.style.zIndex = 100 + index;
  });
}

function resetCardLayout() {
  if (!dealtCardsContainer) return;
  const cards = dealtCardsContainer.querySelectorAll(".card");
  cards.forEach((card) => {
    card.style.left = "";
    card.style.bottom = "";
    card.style.transform = "";
    card.style.transformOrigin = "";
    card.style.position = "";
    card.style.zIndex = "";
    card.style.transition = "";
    card.style.animation = "";
  });
}

// Event listeners are now set up in initDOMElements()

// Initialize DOM elements
function initDOMElements() {
  deckDisplay = document.getElementById("deckDisplay");
  deckCount = document.getElementById("deckCount");
  dealtCardsContainer = document.getElementById("dealtCards");
  shuffleBtn = document.getElementById("shuffleBtn");
  dealBtn = document.getElementById("dealBtn");
  resetBtn = document.getElementById("resetBtn");
  dealCountInput = document.getElementById("dealCount");
  layoutModeBtn = document.getElementById("layoutModeBtn");

  // Verify critical elements exist
  if (!deckDisplay || !deckCount || !dealtCardsContainer) {
    console.error("Critical DOM elements not found!");
    return false;
  }

  // Set up event listeners
  if (shuffleBtn) shuffleBtn.addEventListener("click", handleShuffle);
  if (dealBtn) dealBtn.addEventListener("click", handleDeal);
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
  if (layoutModeBtn) layoutModeBtn.addEventListener("click", handleLayoutModeToggle);
  if (dealCountInput) {
    dealCountInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleDeal();
      }
    });
  }

  updateLayoutModeButton();
  return true;
}

// Initialize game on load
function startGame() {
  const init = () => {
    console.log("Starting initialization...");
    const success = initDOMElements();
    console.log("DOM elements initialized:", success);
    if (success) {
      // Small delay to ensure all elements are ready
      setTimeout(() => {
        console.log("Calling initGame...");
        initGame();
      }, 100);
    } else {
      console.error("Failed to initialize DOM elements");
      // Try again after a delay
      setTimeout(() => {
        console.log("Retrying initialization...");
        if (initDOMElements()) {
          initGame();
        }
      }, 500);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM already loaded
    init();
  }
}

// Start the game
console.log("Script loaded, starting game...");
startGame();

// Add shuffle animation keyframes dynamically
const style = document.createElement("style");
style.textContent = `
  @keyframes shuffleAnimation {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px) rotate(-2deg); }
    75% { transform: translateX(5px) rotate(2deg); }
  }
`;
document.head.appendChild(style);
