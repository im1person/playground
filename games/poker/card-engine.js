/**
 * Card Engine - Card and Deck classes for playing card simulation
 */

class Card {
  constructor(suit, rank) {
    this.suit = suit; // 'spades', 'hearts', 'diamonds', 'clubs'
    this.rank = rank; // 'A', '2'-'10', 'J', 'Q', 'K'
    this.value = this.getNumericValue();
  }

  /**
   * Get numeric value for card (Ace = 1, 2-10 = face value, J/Q/K = 11/12/13)
   */
  getNumericValue() {
    if (this.rank === "A") return 1;
    if (this.rank === "J") return 11;
    if (this.rank === "Q") return 12;
    if (this.rank === "K") return 13;
    return parseInt(this.rank);
  }

  /**
   * Get color of card (red or black)
   */
  getColor() {
    return this.suit === "hearts" || this.suit === "diamonds" ? "red" : "black";
  }

  /**
   * Get suit symbol (Unicode)
   */
  getSuitSymbol() {
    const symbols = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
    };
    return symbols[this.suit] || "";
  }

  /**
   * Convert card to string representation
   */
  toString() {
    return `${this.rank}${this.getSuitSymbol()}`;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  /**
   * Create a standard 52-card deck
   */
  reset() {
    this.cards = [];
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const ranks = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal specified number of cards from top of deck
   * @param {number} count - Number of cards to deal
   * @returns {Card[]} Array of dealt cards
   */
  deal(count = 1) {
    if (count > this.cards.length) {
      count = this.cards.length;
    }
    return this.cards.splice(0, count);
  }

  /**
   * Get number of remaining cards in deck
   */
  getCount() {
    return this.cards.length;
  }

  /**
   * Check if deck is empty
   */
  isEmpty() {
    return this.cards.length === 0;
  }
}

// Export for use in other modules (ES6)
export { Card, Deck };
