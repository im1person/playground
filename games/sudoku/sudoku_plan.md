## Sudoku Game Implementation Plan

### 1. Game Scope & Core Rules

- Support classic 9x9 Sudoku with four selectable difficulties: Easy, Normal, Hard, Master (expert+).
- Required player aids: number highlighting, pencil marks, optional hints (single-step guidance), timer, mistake counter (configurable cap). Include auto-solve function for debugging/accessibility.
- UX niceties: undo/redo, ability to resume saved puzzle from `localStorage`, responsive layout for touch/keyboard play.

### 2. Puzzle Data Strategy

- Preferred: implement generator/solver pair that produces puzzles with unique solutions and difficulty metadata for all four levels.
- Generator phases:
  1. `generateCompleteBoard()` uses randomized backtracking to fill a valid 9×9 grid.
  2. `carveClues(board, targetClues, rules)` removes numbers while ensuring unique solutions via the solver.
  3. `rateDifficulty(grid)` tags each puzzle (Easy/Normal/Hard/Master) based on logic steps or remaining clues.
- Provide `generator.js` exporting `generatePuzzle(difficulty)` and falling back to curated JSON if generation fails or is disabled.
- Backup: curated JSON library of puzzles per difficulty if generator proves too time-consuming.
- Common data model:
  - `grid`: array of 81 integers (0 for empty) representing the starting clues.
  - `solution`: resolved grid for validation/hints.
  - `metadata`: difficulty, seed ID, timestamp, and optionally clue count / heuristic rating.
- Persist active puzzle + progress in `localStorage` (`sudoku-current` key) so reloads restore state.

### 3. UI / UX Design

- Layout: board on left/center, control sidebar (numbers, notes toggle, undo, hints) on right/below for mobile. Board width scales dynamically (max ~520px) to stay readable on phones.
- Keyboard controls: arrow keys to move, number keys to fill, `0`/`Backspace` to clear, `Shift` toggles pencil mode.
- Notes mode clearly indicated; each cell can show multiple penciled digits with subtle mini-glyphs that can be toggled via touch or keyboard.
- Visual clarity: pre-filled clues use distinct color styling, selected value highlights row/column plus all matching digits with a secondary accent layer.
- Accessibility: focusable cells, ARIA labels for row/column, high-contrast theme mode hooks to existing theme toggle.
- Visuals should align with `assets/style.css`; add game-specific styles in `games/sudoku/styles.css`.

### 4. Implementation Steps

1. Create `games/sudoku/` with `index.html`, `intro.html`, `styles.css`, `game.js`.
   - `intro.html` is a lightweight overview page explaining Sudoku basics, the four difficulty tiers, and highlighting player aids and auto-solve so users know what to expect before launching the full game.
2. HTML shell: header/footer includes, board container (9x9 grid), toolbar, status panel (difficulty selector, timer, mistakes).
3. JS modules/features:
   - `state`: manages puzzle data, current inputs, pencil marks, undo stack.
   - `board`: renders grid, handles focus, highlights related rows/columns/values.
   - `puzzle`: generator/loader/solver; exposes `getPuzzle(difficulty)` returning `{ grid, solution, metadata }` plus solver routines for hints/auto-solve. Includes `generator.js` (randomized filler + clue carving) and `puzzle-data.js` fallback dataset.
   - `controls`: number pad, hint logic (next-step highlight), mistakes, victory detection modal, notes toggle and per-cell candidate editing, auto-solve button gated behind confirmation.
   - `storage`: save/load active state to `localStorage`.
4. Hook up timer start/stop, win modal, reset/new puzzle flow, and difficulty selection including the Master tier.
5. Add light analytics (optional) for completed puzzles count stored locally.

### 5. Integration Tasks

- Update `games/index.html` (or wherever games catalogue lives) with a Sudoku card linking to the new game page and optionally a secondary link/button for the intro subpage.
- Add navigation entry in `assets/header.js` menus if required.
- Ensure shared CSS/JS dependencies are referenced consistently with other games.

### 6. Testing & Validation

- Unit tests (if test harness exists) for generator uniqueness and solver correctness; otherwise add a standalone checker script (Node/CLI) that loads each puzzle, runs the solver to confirm a unique solution, and fails builds when any board is invalid.
- Manual test matrix:
  - All difficulties on desktop + mobile viewport.
  - Keyboard-only play, touch interactions, and pencil mode toggling.
  - Persistence: reload mid-game, ensure state restores accurately.
  - Hint/mistake limits behave as expected; no negative timer values or layout shifts.
- Run available linters/formatters; verify Lighthouse accessibility basics (color contrast, focus indicators).

### 7. Stretch Enhancements (Optional)

- Daily puzzle mode seeded by date.
- Stats dashboard (average time, streaks).
- Export/import puzzle via URL parameter for sharing.

Follow these steps sequentially, adjusting scope based on time constraints. Document deviations or assumptions directly in this file as work progresses.

---

## 數獨遊戲實施計畫（正體中文）

### 1. 遊戲範圍與核心規則

- 提供經典 9x9 數獨，難度為輕鬆、標準、困難、大師（專家）四級。
- 玩家輔助：數字高亮、筆記標記、單步提示、計時器、可調整的錯誤次數，並包含自動解題功能（除錯/無障礙）。
- 體驗強化：復原/重做、本地儲存恢復、觸控與鍵盤皆易於操作。

### 2. 題庫與資料策略

- 優先打造題目產生器與求解器，確保唯一解並附上難度資訊。
- 產生流程：
  1. `generateCompleteBoard()` 以隨機回溯填滿合法棋盤。
  2. `carveClues(board, targetClues, rules)` 逐步挖空並透過求解器確認仍為唯一解。
  3. `rateDifficulty(grid)` 依剩餘線索或邏輯步驟評估難度（輕鬆/標準/困難/大師）。
- 產出 `generator.js` 提供 `generatePuzzle(difficulty)`，失敗時退回 `puzzle-data.js` 內建題庫。
- 備案：為各難度準備 JSON 題庫。
- 通用資料結構：`grid`（81 長度陣列，0 代表空格）、`solution`、`metadata`（難度、種子、時間戳、線索數等）。
- 進度儲存在 `localStorage`（鍵名 `sudoku-current`），刷新後可延續遊戲。

### 3. UI / UX 設計

- 版面：棋盤置中，工具列（數字、筆記開關、復原、提示）放於側邊或行動版底部；棋盤寬度會依螢幕自適應（上限約 520px）確保手機可讀性。
- 鍵盤：方向鍵移動，數字鍵輸入，`0/Backspace` 清除，`Shift` 切換筆記模式。
- 每格支援可視筆記，迷你數字可觸控或鍵入切換；符合無障礙需求（可聚焦、ARIA 標籤、高對比）。
- 視覺清晰：預設線索與玩家輸入採不同色彩區分，選取數字時行列與所有相同數字會有雙層高亮效果。
- 視覺風格延續 `assets/style.css`，額外樣式置於 `games/sudoku/styles.css`。

### 4. 實作步驟

1. 建立 `games/sudoku/`，包含 `index.html`、`intro.html`、`styles.css`、`game.js`。
   - `intro.html` 為簡介頁：說明數獨規則、四種難度，並介紹筆記、提示、自動解等特色，方便玩家在進入主遊戲前先了解。
2. HTML 骨架：共用頁首/頁尾、9x9 棋盤容器、工具列、狀態面板（難度、計時、錯誤）。
3. JS 模組：
   - `state`：管理題面、輸入、筆記、復原堆疊。
   - `board`：繪製棋盤、焦點、行列/數字高亮。
   - `puzzle`：題目生成/載入/求解，提供 `getPuzzle(difficulty)` 與提示、自動解所需的求解函式。
   - `controls`：數字面板、提示（下一步說明）、錯誤計數、勝利彈窗、筆記切換與編輯、帶確認的自動解按鈕。
   - `storage`：與本地儲存互動。
4. 打通計時器、勝利提示、重置/新局，以及四種難度切換。
5. 可選：記錄完成局數等輕量統計。

### 5. 整合事項

- 在 `games/index.html` 等遊戲目錄加入 Sudoku 卡片，並視需要提供導向簡介頁的次要按鈕。
- 若需，更新 `assets/header.js` 導覽項目。
- 與其他遊戲一致地引入共用 CSS/JS。

### 6. 測試與驗收

- 有測試框架則為生成器唯一解、求解器準確度撰寫單元測試；否則撰寫獨立檢查腳本（Node/CLI），載入題庫並以求解器驗證唯一解，若任一盤面失敗則中止建置。
- 手動測試：所有難度、桌面/行動版、鍵盤/觸控、筆記模式、提示與錯誤限制。
- 確認重新整理可恢復、提示/計時正常、佈局穩定，執行 lint/格式化與基本可及性檢查（對比度、焦點）。

### 7. 延伸功能

- 每日挑戰（依日期產生）。
- 成就/統計面板與連勝計數。
- 透過 URL 分享或匯入題目。

> 若有範圍調整，請即時在此檔案更新紀錄。
