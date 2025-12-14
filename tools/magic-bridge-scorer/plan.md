# 數字牌遊戲計分工具實作計畫

## 概述

在 `tools/magic-bridge-scorer/` 目錄下建立一個新的計分工具，用於數字牌遊戲的計分。

**重要：** 所有代碼、註釋、變數名稱和用戶界面文本中都不會出現任何版權相關的關鍵字。

## 功能需求

1. **玩家管理**
   - 添加玩家（輸入玩家名稱）
   - 刪除玩家
   - 顯示玩家列表

2. **輸入剩餘牌**
   - 按鈕網格方式：1-13 數字按鈕 + 百搭按鈕，點擊增加
   - 輸入欄位方式：手動輸入每種牌的數量
   - 顯示當前已輸入的牌

3. **計分規則**
   - 數字牌（1-13）：按面值計分
   - 百搭牌：每張 30 分
   - 計算每位玩家的負分（剩餘牌總分）
   - 標記贏家（剩餘牌為 0 的玩家）
   - 贏家獲得所有其他玩家負分總和

4. **結果顯示**
   - 顯示每位玩家的剩餘牌和負分
   - 顯示贏家及其獲得的分數
   - 顯示本回合總分統計

5. **其他功能**
   - 重置本回合
   - 開始新回合
   - 多回合累積分數

6. **保存槽位管理**
   - 支援多個保存槽位（例如：最多 10-20 個槽位）
   - 每個槽位獨立保存不同的遊戲
   - 槽位管理面板：
     - 顯示所有槽位列表（卡片式或列表式）
     - 創建新槽位（命名）
     - 切換槽位（點擊槽位載入）
     - 刪除槽位（確認對話框）
     - 重命名槽位
     - 複製槽位（創建副本）
     - 顯示槽位信息：
       - 遊戲名稱/標題
       - 最後修改時間
       - 回合數
       - 玩家數量
       - 當前回合狀態
   - 每個槽位可以有不同的玩家組合
   - 當前選中的槽位高亮顯示

7. **自動保存功能**
   - 使用 localStorage 自動保存當前槽位的遊戲狀態
   - 保存玩家列表、每回合的計分數據
   - 頁面載入時自動恢復上次選中的槽位
   - 定期自動保存（每次輸入後，使用防抖）
   - 每個槽位獨立保存
   - 顯示保存狀態指示器

8. **分享功能**
   - 將當前槽位的遊戲狀態編碼為 URL 參數或 base64
   - 生成分享連結
   - 複製連結到剪貼板
   - 從 URL 參數自動導入數據（頁面載入時檢查 URL）
   - 可以選擇分享單個槽位或所有槽位

9. **自動導入數據**
   - 從 URL 參數自動導入（頁面載入時）
   - 從 localStorage 自動導入（頁面載入時）
   - 手動導入（貼上分享連結或數據）

## 檔案結構

```
tools/magic-bridge-scorer/
  ├── index.html      # 主頁面
  ├── scorer.js       # 計分邏輯
  ├── styles.css       # 樣式（如果需要）
  └── plan.md         # 本計劃文件
```

## 實作細節

### index.html
- 使用共享的 header、theme-toggle、locale-menu
- **槽位管理面板**（側邊欄或頂部）
- 玩家管理區域（添加/刪除玩家）
- 每位玩家的計分區域
- 結果顯示區域
- 控制按鈕（計算分數、重置、新回合、分享）

### scorer.js

**核心類別和函數：**
- `Player` 類別：管理玩家資料和剩餘牌
- `GameSlot` 類別：管理單個槽位的遊戲狀態
- `SlotManager` 類別：管理所有槽位
- `Scorer` 類別：管理計分邏輯
- 輸入處理：按鈕點擊和輸入欄位
- 分數計算：根據規則計算負分和贏家分數
- UI 更新：動態更新顯示

**槽位管理功能：**
```javascript
class SlotManager {
  constructor() {
    this.slots = [];
    this.currentSlotId = null;
    this.maxSlots = 20;
  }
  
  // 獲取所有槽位
  getAllSlots() {
    const saved = localStorage.getItem('magicBridgeScorerSlots');
    return saved ? JSON.parse(saved) : [];
  }
  
  // 保存所有槽位
  saveAllSlots() {
    localStorage.setItem('magicBridgeScorerSlots', JSON.stringify(this.slots));
    localStorage.setItem('magicBridgeScorerCurrentSlot', this.currentSlotId);
  }
  
  // 創建新槽位
  createSlot(name) {
    if (this.slots.length >= this.maxSlots) {
      throw new Error('Maximum slots reached');
    }
    const slot = {
      id: Date.now().toString(),
      name: name || `Game ${this.slots.length + 1}`,
      players: [],
      rounds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.slots.push(slot);
    this.saveAllSlots();
    return slot;
  }
  
  // 切換槽位
  switchSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (slot) {
      this.currentSlotId = slotId;
      this.saveAllSlots();
      this.loadSlot(slot);
    }
  }
  
  // 刪除槽位
  deleteSlot(slotId) {
    this.slots = this.slots.filter(s => s.id !== slotId);
    if (this.currentSlotId === slotId) {
      this.currentSlotId = this.slots.length > 0 ? this.slots[0].id : null;
    }
    this.saveAllSlots();
  }
  
  // 重命名槽位
  renameSlot(slotId, newName) {
    const slot = this.slots.find(s => s.id === slotId);
    if (slot) {
      slot.name = newName;
      slot.updatedAt = Date.now();
      this.saveAllSlots();
    }
  }
  
  // 複製槽位
  duplicateSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (slot) {
      const newSlot = {
        ...slot,
        id: Date.now().toString(),
        name: `${slot.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.slots.push(newSlot);
      this.saveAllSlots();
      return newSlot;
    }
  }
  
  // 獲取槽位信息摘要
  getSlotSummary(slot) {
    return {
      name: slot.name,
      playerCount: slot.players.length,
      roundCount: slot.rounds.length,
      lastUpdated: new Date(slot.updatedAt).toLocaleString(),
      isCurrent: slot.id === this.currentSlotId
    };
  }
}
```

**自動保存功能：**
```javascript
// 保存當前槽位到 localStorage
function saveCurrentSlot() {
  const slotManager = getSlotManager();
  const currentSlot = slotManager.slots.find(s => s.id === slotManager.currentSlotId);
  if (currentSlot) {
    // 更新當前槽位的數據
    currentSlot.players = players.map(p => ({
      name: p.name,
      tiles: p.tiles,
      jokers: p.jokers
    }));
    currentSlot.rounds = rounds;
    currentSlot.updatedAt = Date.now();
    slotManager.saveAllSlots();
  }
}

// 從 localStorage 載入槽位
function loadSlot(slot) {
  players = slot.players.map(p => new Player(p.name, p.tiles, p.jokers));
  rounds = slot.rounds || [];
  updateUI();
}
```

**分享功能：**
```javascript
// 將當前槽位編碼為 base64
function exportCurrentSlot() {
  const slotManager = getSlotManager();
  const currentSlot = slotManager.slots.find(s => s.id === slotManager.currentSlotId);
  if (currentSlot) {
    const encoded = btoa(JSON.stringify(currentSlot));
    return encoded;
  }
}

// 生成分享連結（包含槽位 ID）
function generateShareLink() {
  const slotManager = getSlotManager();
  const encoded = exportCurrentSlot();
  const url = new URL(window.location.href);
  url.searchParams.set('slot', encoded);
  return url.toString();
}

// 從 URL 導入槽位
function importSlotFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const slotData = urlParams.get('slot');
  if (slotData) {
    try {
      const slot = JSON.parse(atob(slotData));
      const slotManager = getSlotManager();
      // 創建新槽位或更新現有槽位
      slotManager.createSlot(slot.name);
      loadSlot(slot);
    } catch (e) {
      console.error('Failed to import slot from URL:', e);
    }
  }
}
```

**自動導入邏輯：**
```javascript
// 頁面載入時的初始化
function init() {
  const slotManager = new SlotManager();
  slotManager.slots = slotManager.getAllSlots();
  
  // 優先從 URL 導入（如果有）
  if (window.location.search.includes('slot=')) {
    importSlotFromURL();
  } else {
    // 從 localStorage 恢復上次選中的槽位
    const savedSlotId = localStorage.getItem('magicBridgeScorerCurrentSlot');
    if (savedSlotId && slotManager.slots.find(s => s.id === savedSlotId)) {
      slotManager.switchSlot(savedSlotId);
    } else if (slotManager.slots.length > 0) {
      // 如果沒有保存的槽位，載入第一個
      slotManager.switchSlot(slotManager.slots[0].id);
    } else {
      // 創建默認槽位
      slotManager.createSlot('Game 1');
      slotManager.switchSlot(slotManager.slots[0].id);
    }
  }
  
  // 監聽數據變更，自動保存
  setupAutoSave();
}

// 設置自動保存
function setupAutoSave() {
  let saveTimer;
  function autoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCurrentSlot();
      updateSaveIndicator(true); // 顯示已保存
    }, 500); // 500ms 後保存
  }
  
  // 監聽所有數據變更事件
  // ...
}
```

### 計分邏輯
```javascript
// 計算玩家負分
function calculatePlayerScore(player) {
  let score = 0;
  // 數字牌：按面值計分
  for (let i = 1; i <= 13; i++) {
    score += (player.tiles[i] || 0) * i;
  }
  // 百搭牌：每張 30 分
  score += (player.jokers || 0) * 30;
  return score;
}

// 計算贏家分數
function calculateWinnerScore(players, winnerIndex) {
  let totalNegativeScore = 0;
  players.forEach((player, index) => {
    if (index !== winnerIndex) {
      totalNegativeScore += calculatePlayerScore(player);
    }
  });
  return totalNegativeScore;
}
```

### UI 設計
- 響應式設計，支援手機和桌面
- 使用共享的主題系統（明/暗模式）
- 清晰的視覺反饋
- 易用的輸入介面
- **槽位管理面板**：
  - 側邊欄或可摺疊面板
  - 槽位卡片顯示（名稱、信息、操作按鈕）
  - 當前槽位高亮
  - 創建/刪除/重命名按鈕
- 分享按鈕和狀態指示器
- 保存狀態指示器

## 實作步驟

1. 建立 `tools/magic-bridge-scorer/` 目錄
2. 建立 `index.html` - 基本結構和 UI（包含槽位管理面板、分享按鈕）
3. 建立 `scorer.js` - 計分邏輯、玩家管理、槽位管理、自動保存、分享功能
4. 建立 `styles.css` - 樣式（如果需要，或使用共享樣式）
5. 整合到主頁面 `index.html`（添加連結）

## 技術細節

- 使用 ES6 模組
- 響應式設計
- 支援中英文（使用 data-en 和 data-zh-Hant 屬性）
- 使用共享的樣式和主題系統
- **避免使用任何版權相關關鍵字**
- localStorage 用於自動保存（多個槽位）
- URL 參數用於分享功能
- Clipboard API 用於複製分享連結

## 命名規範

- 目錄名稱：`magic-bridge-scorer`
- localStorage keys：
  - `magicBridgeScorerSlots` - 所有槽位數據
  - `magicBridgeScorerCurrentSlot` - 當前選中的槽位 ID
- URL 參數：`slot`
- 變數和函數：使用通用名稱如 `tile`, `joker`, `player`, `score`, `slot`
- 用戶界面：使用 "數字牌遊戲計分" 或 "Magic Bridge Scorer" 等通用描述

## 數據結構

```javascript
// 槽位數據結構
{
  id: "1234567890",
  name: "Game 1",
  players: [
    {
      name: "玩家1",
      tiles: { 1: 2, 2: 0, 3: 1, ... 13: 0 }, // 每種數字牌的數量
      jokers: 1 // 百搭牌數量
    }
  ],
  rounds: [
    {
      roundNumber: 1,
      scores: { player1: -50, player2: 30 },
      winner: "player1",
      timestamp: 1234567890
    }
  ],
  createdAt: 1234567890,
  updatedAt: 1234567890
}

// 所有槽位存儲結構
{
  slots: [slot1, slot2, ...],
  currentSlotId: "1234567890"
}
```

