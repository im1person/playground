/**
 * Card UI - Rendering and interaction functions for playing cards
 */

/**
 * Create a card DOM element
 * @param {Card} card - Card object to render
 * @param {boolean} faceUp - Whether card is face-up
 * @returns {HTMLElement} Card element
 */
function createCardElement(card, faceUp = true) {
  const cardDiv = document.createElement("div");
  cardDiv.className = `card ${faceUp ? "face-up" : "face-down"}`;
  cardDiv.setAttribute("data-suit", card.suit);
  cardDiv.setAttribute("data-rank", card.rank);
  cardDiv.setAttribute("data-color", card.getColor());
  cardDiv.setAttribute("role", "button");
  cardDiv.setAttribute("tabindex", "0");
  cardDiv.setAttribute(
    "aria-label",
    faceUp ? card.toString() : "Face down card"
  );

  const suitSymbol = card.getSuitSymbol();
  const color = card.getColor();

  // Card front (face-up)
  const cardFront = document.createElement("div");
  cardFront.className = "card-front";

  // Top-left corner
  const topLeft = document.createElement("div");
  topLeft.className = "card-corner top-left";
  const rankTop = document.createElement("span");
  rankTop.className = "rank";
  rankTop.textContent = card.rank;
  const suitTop = document.createElement("span");
  suitTop.className = "suit";
  suitTop.textContent = suitSymbol;
  topLeft.appendChild(rankTop);
  topLeft.appendChild(suitTop);

  // Center (large suit symbol or face card)
  const center = document.createElement("div");
  center.className = "card-center";
  if (["J", "Q", "K"].includes(card.rank)) {
    const faceCard = document.createElement("div");
    faceCard.className = "face-card";
    faceCard.textContent = card.rank;
    center.appendChild(faceCard);
  } else if (card.rank === "A") {
    const aceSymbol = document.createElement("span");
    aceSymbol.className = "suit-large ace";
    aceSymbol.textContent = suitSymbol;
    center.appendChild(aceSymbol);
  } else {
    // Number cards - show suit symbol in center
    const suitLarge = document.createElement("span");
    suitLarge.className = "suit-large";
    suitLarge.textContent = suitSymbol;
    center.appendChild(suitLarge);
  }

  // Bottom-right corner
  const bottomRight = document.createElement("div");
  bottomRight.className = "card-corner bottom-right";
  const rankBottom = document.createElement("span");
  rankBottom.className = "rank";
  rankBottom.textContent = card.rank;
  const suitBottom = document.createElement("span");
  suitBottom.className = "suit";
  suitBottom.textContent = suitSymbol;
  bottomRight.appendChild(rankBottom);
  bottomRight.appendChild(suitBottom);

  cardFront.appendChild(topLeft);
  cardFront.appendChild(center);
  cardFront.appendChild(bottomRight);

  // Card back (face-down)
  const cardBack = document.createElement("div");
  cardBack.className = "card-back";
  // Create pattern for card back
  for (let i = 0; i < 8; i++) {
    const patternLine = document.createElement("div");
    patternLine.className = "pattern-line";
    cardBack.appendChild(patternLine);
  }

  cardDiv.appendChild(cardFront);
  cardDiv.appendChild(cardBack);

  return cardDiv;
}

/**
 * Render a deck (face-down pile)
 * @param {Deck} deck - Deck object
 * @param {HTMLElement} container - Container element to render into
 */
function renderDeck(deck, container) {
  if (!container) {
    console.error("renderDeck: container is null or undefined");
    return;
  }
  if (!deck) {
    console.error("renderDeck: deck is null or undefined");
    return;
  }
  container.innerHTML = "";
  const count = deck.getCount();
  console.log("renderDeck: rendering", count, "cards");

  if (count === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "deck-empty";
    emptyMsg.textContent = "Deck Empty";
    container.appendChild(emptyMsg);
    return;
  }

  // Create a visual representation of the deck (stacked cards)
  const deckVisual = document.createElement("div");
  deckVisual.className = "deck-visual";
  deckVisual.setAttribute("aria-label", `${count} cards in deck`);

  // Create a few overlapping card backs to show it's a deck
  for (let i = 0; i < Math.min(5, count); i++) {
    const cardBack = document.createElement("div");
    cardBack.className = "deck-card-back";
    cardBack.style.transform = `translate(${i * 2}px, ${i * 2}px) rotate(${
      i * 0.5
    }deg)`;
    cardBack.style.zIndex = i;
    deckVisual.appendChild(cardBack);
  }

  container.appendChild(deckVisual);
}

/**
 * Render a hand of cards
 * @param {Card[]} cards - Array of card objects
 * @param {HTMLElement} container - Container element to render into
 * @param {boolean} faceUp - Whether cards should be face-up
 */
function renderHand(cards, container, faceUp = true) {
  // Verify container is a valid DOM element
  if (!container || !(container instanceof HTMLElement)) {
    console.error("Container is not a valid HTMLElement", container);
    return;
  }

  // Clear container completely - use innerHTML to ensure clean slate
  container.innerHTML = "";

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return;
  }

  // Create and append each card element
  cards.forEach((card, index) => {
    // Verify card is a Card object
    if (
      !card ||
      typeof card.getSuitSymbol !== "function" ||
      typeof card.getColor !== "function"
    ) {
      console.error("Invalid card object", card);
      return;
    }

    try {
      const cardElement = createCardElement(card, faceUp);
      if (cardElement && cardElement instanceof HTMLElement) {
        cardElement.style.animationDelay = `${index * 0.1}s`;
        container.appendChild(cardElement);
      } else {
        console.error(
          "Failed to create card element - not an HTMLElement",
          cardElement
        );
      }
    } catch (error) {
      console.error("Error creating card element", error, card);
    }
  });
}

/**
 * Flip a card element
 * @param {HTMLElement} cardElement - Card DOM element
 */
function flipCard(cardElement) {
  const isFaceUp = cardElement.classList.contains("face-up");
  cardElement.classList.toggle("face-up");
  cardElement.classList.toggle("face-down");

  // Update aria-label
  if (isFaceUp) {
    cardElement.setAttribute("aria-label", "Face down card");
  } else {
    const rank = cardElement.getAttribute("data-rank");
    const suit = cardElement.getAttribute("data-suit");
    const suitSymbols = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
    };
    cardElement.setAttribute("aria-label", `${rank}${suitSymbols[suit]}`);
  }
}

/**
 * Add flip animation to card
 * @param {HTMLElement} cardElement - Card DOM element
 */
function animateFlip(cardElement) {
  cardElement.classList.add("flipping");
  setTimeout(() => {
    cardElement.classList.remove("flipping");
  }, 300);
}

// Export functions for use in other modules (ES6)
export { createCardElement, renderDeck, renderHand, flipCard, animateFlip };
