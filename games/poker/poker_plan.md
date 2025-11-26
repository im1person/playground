## Playing Card Simulation - Implementation Plan

### 1. Scope & Core Features

**Phase 1: Basic Card Simulation** (Current Focus)

- Visual card rendering (52-card standard deck)
- Card faces: suits (♠♥♦♣), ranks (A, 2-10, J, Q, K)
- Card backs (face-down cards)
- Deck creation and management
- Shuffle functionality
- Deal cards (single or multiple)
- Flip cards (face-up ↔ face-down)
- Basic interactions (click to flip, drag cards)
- Responsive design

**Future Phases:**

- Phase 2: Hand evaluation (for poker games)
- Phase 3: Poker game logic
- Phase 4: AI opponents

### 2. File Structure

```
games/poker/
  ├── index.html          # Main simulation page
  ├── card-engine.js      # Card & Deck classes
  ├── card-ui.js          # Card rendering & interactions
  ├── styles.css          # Card styling
  └── poker_plan.md       # This file
```

### 3. Core Components

**Card Engine (`card-engine.js`):**

- `Card` class:
  - Properties: `suit` (spades, hearts, diamonds, clubs), `rank` (A, 2-10, J, Q, K), `value` (numeric)
  - Methods: `toString()`, `getColor()` (red/black)
- `Deck` class:
  - Properties: `cards` (array of Card objects)
  - Methods:
    - `constructor()` - creates standard 52-card deck
    - `shuffle()` - randomizes card order
    - `deal(count)` - removes and returns cards from top
    - `reset()` - recreates full deck
    - `getCount()` - returns remaining cards

**Card UI (`card-ui.js`):**

- `renderCard(card, faceUp)` - creates DOM element for card
- `renderDeck(deck)` - displays deck
- `renderHand(cards)` - displays hand of cards
- Card flip animation
- Click handlers for interactions

### 4. UI Design

**Layout:**

- Deck area (shuffled deck, face-down)
- Action buttons: Shuffle, Deal, Reset
- Card display area (dealt cards)
- Settings: Number of cards to deal

**Card Visual Design:**

- Card dimensions: ~60px × 90px (mobile) / ~80px × 120px (desktop)
- White/light background with border
- Suit symbols: ♠ ♥ ♦ ♣ (Unicode or styled)
- Rank display: top-left and bottom-right corners
- Face cards: J, Q, K with styled text or icons
- Card back: patterned design (diagonal lines, dots, or custom pattern)
- Hover effects: slight lift/shadow
- Flip animation: 3D rotation or fade

**Color Scheme:**

- Red suits: #d32f2f or #c62828
- Black suits: #212121 or #000
- Card background: #ffffff (light) / #f5f5f5 (dark mode)
- Card border: #ccc (light) / #666 (dark)
- Card back: #1976d2 or gradient pattern

### 5. Implementation Steps

**Step 1: Card Engine**

1. Create `card-engine.js`:

   ```javascript
   class Card {
     constructor(suit, rank) { ... }
     getColor() { ... }
     toString() { ... }
   }

   class Deck {
     constructor() { ... }
     shuffle() { ... }
     deal(count) { ... }
     reset() { ... }
   }
   ```

**Step 2: HTML Structure** 2. Create `index.html`:

- Header with theme/locale support
- Main container:
  - Deck display area
  - Control panel (buttons)
  - Dealt cards area
- Include shared assets (theme-toggle, locale-menu, header)

**Step 3: Card Rendering** 3. Create `card-ui.js`:

- `createCardElement(card, faceUp)` - returns DOM element
- Card styling (suits, ranks, face cards)
- Card back design
- Flip animation function

**Step 4: Styling** 4. Create `styles.css`:

- Card dimensions and layout
- Suit colors and styling
- Card back pattern
- Flip animation keyframes
- Responsive breakpoints
- Theme support (light/dark)

**Step 5: Interactions** 5. Wire up interactions:

- Shuffle button → shuffle deck
- Deal button → deal N cards
- Click card → flip card
- Reset button → reset deck
- Optional: drag cards

**Step 6: Polish** 6. Add animations:

- Shuffle animation (cards moving)
- Deal animation (cards appearing)
- Flip animation (smooth transition)
- Hover effects

### 6. Card Rendering Details

**Card HTML Structure:**

```html
<div class="card" data-suit="hearts" data-rank="A" data-face-up="true">
  <div class="card-front">
    <div class="card-corner top-left">
      <span class="rank">A</span>
      <span class="suit">♥</span>
    </div>
    <div class="card-center">
      <span class="suit-large">♥</span>
    </div>
    <div class="card-corner bottom-right">
      <span class="rank">A</span>
      <span class="suit">♥</span>
    </div>
  </div>
  <div class="card-back">
    <!-- Pattern design -->
  </div>
</div>
```

**Suit Symbols:**

- Spades: ♠ (U+2660)
- Hearts: ♥ (U+2665)
- Diamonds: ♦ (U+2666)
- Clubs: ♣ (U+2663)

**Face Cards:**

- Jack: J
- Queen: Q
- King: K
- Ace: A (can be styled larger)

### 7. Features to Implement

**Core:**

- [x] Card class with suit and rank
- [x] Deck class with 52 cards
- [x] Shuffle algorithm (Fisher-Yates)
- [x] Deal cards function
- [x] Visual card rendering
- [x] Card flip (face-up/face-down)
- [x] Responsive layout

**Interactions:**

- [ ] Click card to flip
- [ ] Shuffle button
- [ ] Deal button (with count input)
- [ ] Reset deck button
- [ ] Optional: Drag and drop cards
- [ ] Optional: Multiple hands/deal areas

**Visual:**

- [ ] Card animations (flip, deal, shuffle)
- [ ] Hover effects
- [ ] Card shadows and depth
- [ ] Smooth transitions
- [ ] Theme support (light/dark mode)

### 8. Technical Details

**Shuffle Algorithm:**

```javascript
shuffle() {
  for (let i = this.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
  }
}
```

**Card Flip Animation:**

- CSS: `transform: rotateY(180deg)` with `transition`
- Or: fade out/in with `opacity`
- Toggle `face-up` class on click

**Responsive Design:**

- Mobile: Stack cards vertically or in smaller grid
- Tablet: 2-3 columns
- Desktop: Horizontal layout with more cards visible

### 9. Integration

- Add to main `index.html`:
  - Title: "Playing Cards" / "紙牌模擬"
  - Description: "Interactive playing card deck simulation" / "互動式紙牌模擬"
  - Link to `games/poker/index.html`

### 10. Future Enhancements

- Multiple decks
- Custom card designs
- Card sorting (by suit, rank)
- Hand evaluation (for poker)
- Card games (War, Solitaire, etc.)
- Export/import deck state
- Card statistics (cards dealt, remaining)

---

## 紙牌模擬 - 實施計畫（正體中文）

### 1. 範圍與核心功能

**階段 1：基本紙牌模擬**（目前重點）

- 視覺化紙牌渲染（52 張標準牌組）
- 牌面：花色（♠♥♦♣）、點數（A, 2-10, J, Q, K）
- 牌背（蓋牌）
- 牌組建立與管理
- 洗牌功能
- 發牌（單張或多張）
- 翻牌（正面 ↔ 背面）
- 基本互動（點擊翻牌、拖曳）
- 響應式設計

### 2. 檔案結構

```
games/poker/
  ├── index.html          # 主模擬頁面
  ├── card-engine.js      # 紙牌與牌組類別
  ├── card-ui.js          # 紙牌渲染與互動
  ├── styles.css          # 紙牌樣式
  └── poker_plan.md       # 本檔案
```

### 3. 核心元件

**紙牌引擎（`card-engine.js`）：**

- `Card` 類別：花色、點數、數值
- `Deck` 類別：建立、洗牌、發牌、重置

**紙牌 UI（`card-ui.js`）：**

- 渲染紙牌、牌組、手牌
- 翻牌動畫
- 點擊處理

### 4. UI 設計

**版面：**

- 牌組區域（洗好的牌組，蓋牌）
- 操作按鈕：洗牌、發牌、重置
- 紙牌顯示區域（已發的牌）
- 設定：發牌數量

**紙牌視覺設計：**

- 尺寸：約 60px × 90px（行動） / 80px × 120px（桌面）
- 白色/淺色背景與邊框
- 花色符號：♠ ♥ ♦ ♣
- 點數顯示：左上與右下角
- 人頭牌：J, Q, K 帶樣式文字或圖示
- 牌背：圖案設計
- 懸停效果：輕微提升/陰影
- 翻牌動畫：3D 旋轉或淡入淡出

### 5. 實作步驟

1. 建立紙牌引擎（Card、Deck 類別）
2. 建立 HTML 結構
3. 實作紙牌渲染
4. 建立樣式
5. 連接互動
6. 加入動畫與美化

### 6. 功能清單

**核心：**

- [x] Card 類別（花色、點數）
- [x] Deck 類別（52 張牌）
- [x] 洗牌演算法（Fisher-Yates）
- [x] 發牌功能
- [x] 視覺化紙牌渲染
- [x] 翻牌（正面/背面）
- [x] 響應式版面

**互動：**

- [ ] 點擊翻牌
- [ ] 洗牌按鈕
- [ ] 發牌按鈕（含數量輸入）
- [ ] 重置牌組按鈕
- [ ] 選用：拖放紙牌
- [ ] 選用：多手牌/發牌區域

**視覺：**

- [ ] 紙牌動畫（翻牌、發牌、洗牌）
- [ ] 懸停效果
- [ ] 紙牌陰影與深度
- [ ] 平滑過渡
- [ ] 主題支援（明/暗模式）

---

> 此為第一階段：基本紙牌模擬。完成後可擴充為完整撲克遊戲。
