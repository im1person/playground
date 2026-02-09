/**
 * Magic Bridge Scorer - Main Logic
 */

// Player class
class Player {
  constructor(name) {
    this.name = name;
    this.tiles = {}; // {1: count, 2: count, ..., 13: count}
    this.jokers = 0;
    // Initialize all tile counts to 0
    for (let i = 1; i <= 13; i++) {
      this.tiles[i] = 0;
    }
  }

  getTotalTiles() {
    let total = this.jokers;
    for (let i = 1; i <= 13; i++) {
      total += this.tiles[i] || 0;
    }
    return total;
  }

  reset() {
    for (let i = 1; i <= 13; i++) {
      this.tiles[i] = 0;
    }
    this.jokers = 0;
  }
}

// Slot Manager class
class SlotManager {
  constructor() {
    this.slots = [];
    this.currentSlotId = null;
    this.maxSlots = 20;
  }

  getAllSlots() {
    try {
      const saved = localStorage.getItem("magicBridgeScorerSlots");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading slots:", e);
      return [];
    }
  }

  saveAllSlots() {
    try {
      localStorage.setItem(
        "magicBridgeScorerSlots",
        JSON.stringify(this.slots)
      );
      if (this.currentSlotId) {
        localStorage.setItem(
          "magicBridgeScorerCurrentSlot",
          this.currentSlotId
        );
      }
    } catch (e) {
      console.error("Error saving slots:", e);
    }
  }

  createSlot(name) {
    if (this.slots.length >= this.maxSlots) {
      throw new Error("Maximum slots reached");
    }
    const slot = {
      id: Date.now().toString(),
      name: name || `Game ${this.slots.length + 1}`,
      players: [],
      rounds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.slots.push(slot);
    this.saveAllSlots();
    return slot;
  }

  switchSlot(slotId) {
    const slot = this.slots.find((s) => s.id === slotId);
    if (slot) {
      this.currentSlotId = slotId;
      this.saveAllSlots();
      return slot;
    }
    return null;
  }

  deleteSlot(slotId) {
    this.slots = this.slots.filter((s) => s.id !== slotId);
    if (this.currentSlotId === slotId) {
      this.currentSlotId = this.slots.length > 0 ? this.slots[0].id : null;
    }
    this.saveAllSlots();
  }

  renameSlot(slotId, newName) {
    const slot = this.slots.find((s) => s.id === slotId);
    if (slot) {
      slot.name = newName;
      slot.updatedAt = Date.now();
      this.saveAllSlots();
    }
  }

  duplicateSlot(slotId) {
    const slot = this.slots.find((s) => s.id === slotId);
    if (slot) {
      const newSlot = {
        ...JSON.parse(JSON.stringify(slot)), // Deep copy
        id: Date.now().toString(),
        name: `${slot.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.slots.push(newSlot);
      this.saveAllSlots();
      return newSlot;
    }
    return null;
  }

  getSlotSummary(slot) {
    const locale = document.documentElement.lang || "en";
    const date = new Date(slot.updatedAt);
    return {
      name: slot.name,
      playerCount: slot.players ? slot.players.length : 0,
      roundCount: slot.rounds ? slot.rounds.length : 0,
      lastUpdated: date.toLocaleString((locale === "zh-HK" || locale === "zh-Hant") ? "zh-HK" : "en-US"),
      isCurrent: slot.id === this.currentSlotId,
    };
  }
}

// Game state
let slotManager = null;
let players = [];
let currentRound = null;
let rounds = [];

// DOM elements
let slotPanel = null;
let slotList = null;
let playerList = null;
let playerScoringAreas = null;
let resultsSection = null;
let resultsContent = null;
let roundsHistory = null;
let roundsList = null;
let settlementSection = null;
let settlementContent = null;
let currentSlotInfo = null;
let saveIndicator = null;

// Auto-save timer
let saveTimer = null;

/**
 * Initialize the application
 */
function init() {
  // Initialize slot manager
  slotManager = new SlotManager();
  slotManager.slots = slotManager.getAllSlots();

  // Get DOM elements
  slotPanel = document.getElementById("slotPanel");
  slotList = document.getElementById("slotList");
  playerList = document.getElementById("playerList");
  playerScoringAreas = document.getElementById("playerScoringAreas");
  resultsSection = document.getElementById("resultsSection");
  resultsContent = document.getElementById("resultsContent");
  roundsHistory = document.getElementById("roundsHistory");
  roundsList = document.getElementById("roundsList");
  settlementSection = document.getElementById("settlementSection");
  settlementContent = document.getElementById("settlementContent");
  currentSlotInfo = document.getElementById("currentSlotInfo");
  saveIndicator = document.getElementById("saveIndicator");

  // Check for URL import first
  const urlParams = new URLSearchParams(window.location.search);
  const slotData = urlParams.get("slot");
  if (slotData) {
    importSlotFromURL(slotData);
  } else {
    // Load from localStorage
    const savedSlotId = localStorage.getItem("magicBridgeScorerCurrentSlot");
    if (
      savedSlotId &&
      slotManager.slots.find((s) => s.id === savedSlotId)
    ) {
      loadSlot(slotManager.switchSlot(savedSlotId));
    } else if (slotManager.slots.length > 0) {
      loadSlot(slotManager.switchSlot(slotManager.slots[0].id));
    } else {
      // Create default slot
      const defaultSlot = slotManager.createSlot("Game 1");
      loadSlot(slotManager.switchSlot(defaultSlot.id));
    }
  }

  // Setup event listeners
  setupEventListeners();

  // Update UI
  updateSlotList();
  updateUI();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Slot panel toggle
  document
    .getElementById("toggleSlotPanel")
    .addEventListener("click", toggleSlotPanel);

  // Create slot button
  document
    .getElementById("createSlotBtn")
    .addEventListener("click", () => openSlotModal());

  // Add player button
  document
    .getElementById("addPlayerBtn")
    .addEventListener("click", handleAddPlayer);

  // Enter key on player name input
  document
    .getElementById("newPlayerName")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleAddPlayer();
      }
    });

  // Calculate button
  document
    .getElementById("calculateBtn")
    .addEventListener("click", calculateScores);

  // Reset round button
  document
    .getElementById("resetRoundBtn")
    .addEventListener("click", resetRound);

  // New round button
  document
    .getElementById("newRoundBtn")
    .addEventListener("click", startNewRound);

  // Share button
  document.getElementById("shareBtn").addEventListener("click", openShareModal);

  // Modal close buttons
  document
    .getElementById("closeSlotModal")
    .addEventListener("click", closeSlotModal);
  document
    .getElementById("closeShareModal")
    .addEventListener("click", closeShareModal);
  document
    .getElementById("cancelSlotBtn")
    .addEventListener("click", closeSlotModal);
  document
    .getElementById("saveSlotBtn")
    .addEventListener("click", handleSaveSlot);

  // Copy share link button
  document
    .getElementById("copyShareLinkBtn")
    .addEventListener("click", copyShareLink);

  // Click outside modal to close
  document.getElementById("slotModal").addEventListener("click", (e) => {
    if (e.target.id === "slotModal") {
      closeSlotModal();
    }
  });
  document.getElementById("shareModal").addEventListener("click", (e) => {
    if (e.target.id === "shareModal") {
      closeShareModal();
    }
  });
}

/**
 * Toggle slot panel
 */
function toggleSlotPanel() {
  slotPanel.classList.toggle("collapsed");
  const icon = document.getElementById("toggleIcon");
  icon.textContent = slotPanel.classList.contains("collapsed") ? "+" : "−";
}

/**
 * Update slot list UI
 */
function updateSlotList() {
  if (!slotList) return;

  slotList.innerHTML = "";

  slotManager.slots.forEach((slot) => {
    const summary = slotManager.getSlotSummary(slot);
    const slotItem = document.createElement("div");
    slotItem.className = `slot-item ${summary.isCurrent ? "active" : ""}`;
    slotItem.innerHTML = `
      <div class="slot-item-header">
        <div class="slot-item-name" title="${escapeHtml(slot.name)}">${escapeHtml(slot.name)}</div>
        <div class="slot-item-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); handleRenameSlot('${slot.id}')" title="Rename" aria-label="Rename">✏️</button>
          <button class="btn-icon" onclick="event.stopPropagation(); handleDuplicateSlot('${slot.id}')" title="Duplicate" aria-label="Duplicate">📋</button>
          <button class="btn-icon" onclick="event.stopPropagation(); handleDeleteSlot('${slot.id}')" title="Delete" aria-label="Delete">🗑️</button>
        </div>
      </div>
      <div class="slot-item-info">
        ${summary.playerCount} ${getLocalizedText("players", "玩家")}, ${summary.roundCount} ${getLocalizedText("rounds", "回合")}<br>
        <small>${summary.lastUpdated}</small>
      </div>
    `;
    slotItem.addEventListener("click", (e) => {
      if (!e.target.closest(".slot-item-actions")) {
        switchToSlot(slot.id);
      }
    });
    slotList.appendChild(slotItem);
  });
}

/**
 * Switch to a slot
 */
function switchToSlot(slotId) {
  // Save current slot first
  saveCurrentSlot();

  // Switch slot
  const slot = slotManager.switchSlot(slotId);
  if (slot) {
    loadSlot(slot);
    updateSlotList();
    updateUI();
  }
}

/**
 * Load slot data
 */
function loadSlot(slot) {
  // Load players
  players = [];
  if (slot.players && slot.players.length > 0) {
    slot.players.forEach((pData) => {
      const player = new Player(pData.name);
      player.tiles = { ...pData.tiles };
      player.jokers = pData.jokers || 0;
      players.push(player);
    });
  }

  // Load rounds
  rounds = slot.rounds || [];

  // Reset current round
  currentRound = null;

  updateUI();
}

/**
 * Save current slot
 */
function saveCurrentSlot() {
  if (!slotManager.currentSlotId) return;

  const currentSlot = slotManager.slots.find(
    (s) => s.id === slotManager.currentSlotId
  );
  if (currentSlot) {
    // Update current slot data
    currentSlot.players = players.map((p) => ({
      name: p.name,
      tiles: { ...p.tiles },
      jokers: p.jokers,
    }));
    currentSlot.rounds = rounds;
    currentSlot.updatedAt = Date.now();
    slotManager.saveAllSlots();
  }
}

/**
 * Auto-save setup
 */
function triggerAutoSave() {
  clearTimeout(saveTimer);
  saveIndicator.classList.add("saving");
  saveIndicator.querySelector("span").textContent = getLocalizedText(
    "Saving...",
    "保存中..."
  );

  saveTimer = setTimeout(() => {
    saveCurrentSlot();
    saveIndicator.classList.remove("saving");
    saveIndicator.querySelector("span").textContent = getLocalizedText(
      "Saved",
      "已保存"
    );
  }, 500);
}

/**
 * Handle add player
 */
function handleAddPlayer() {
  const input = document.getElementById("newPlayerName");
  const name = input.value.trim();
  if (!name) return;

  // Check if player already exists
  if (players.some((p) => p.name === name)) {
    alert(getLocalizedText("Player already exists", "玩家已存在"));
    return;
  }

  const player = new Player(name);
  players.push(player);
  input.value = "";

  triggerAutoSave();
  updateUI();
}

/**
 * Handle delete player
 */
function handleDeletePlayer(playerName) {
  if (
    confirm(
      getLocalizedText(
        `Delete player "${playerName}"?`,
        `確定要刪除玩家 "${playerName}" 嗎？`
      )
    )
  ) {
    players = players.filter((p) => p.name !== playerName);
    triggerAutoSave();
    updateUI();
  }
}

/**
 * Update tile count
 */
function updateTileCount(playerName, tileValue, delta) {
  const player = players.find((p) => p.name === playerName);
  if (!player) return;

  if (tileValue === "joker") {
    player.jokers = Math.max(0, player.jokers + delta);
  } else {
    const value = parseInt(tileValue);
    if (value >= 1 && value <= 13) {
      player.tiles[value] = Math.max(0, (player.tiles[value] || 0) + delta);
    }
  }

  triggerAutoSave();
  // Update count display without recreating entire area
  updateTileCountDisplay(player);
}


/**
 * Calculate player score
 */
function calculatePlayerScore(player) {
  let score = 0;
  // Number tiles: face value
  for (let i = 1; i <= 13; i++) {
    score += (player.tiles[i] || 0) * i;
  }
  // Jokers: 30 points each
  score += (player.jokers || 0) * 30;
  return score;
}

/**
 * Calculate scores
 */
function calculateScores() {
  if (players.length === 0) {
    alert(getLocalizedText("No players", "沒有玩家"));
    return;
  }

  // Calculate scores for each player
  const scores = players.map((player) => ({
    player: player.name,
    score: calculatePlayerScore(player),
    totalTiles: player.getTotalTiles(),
  }));

  // Find winner (player with 0 tiles)
  const winner = scores.find((s) => s.totalTiles === 0);

  // Calculate winner score (sum of all negative scores)
  let winnerScore = 0;
  if (winner) {
    scores.forEach((s) => {
      if (s.player !== winner.player) {
        winnerScore += s.score;
      }
    });
  }

  // Store current round
  currentRound = {
    scores: scores,
    winner: winner ? winner.player : null,
    winnerScore: winnerScore,
    timestamp: Date.now(),
  };

  // Display results
  displayResults(scores, winner, winnerScore);

  // Show results section
  resultsSection.style.display = "block";
}

/**
 * Display results
 */
function displayResults(scores, winner, winnerScore) {
  if (!resultsContent) return;

  resultsContent.innerHTML = "";

  scores.forEach((s) => {
    const isWinner = winner && s.player === winner.player;
    const resultItem = document.createElement("div");
    resultItem.className = `result-item ${isWinner ? "winner" : ""}`;
    resultItem.innerHTML = `
      <div class="result-item-header">
        <div class="result-item-name">${escapeHtml(s.player)}</div>
        <div class="result-item-score ${s.score > 0 ? "negative" : ""}">
          ${s.score > 0 ? "-" : ""}${Math.abs(s.score)}
        </div>
      </div>
      ${isWinner ? `<div style="margin-top: 10px; color: #4caf50; font-weight: 600;">${getLocalizedText("Winner! +", "獲勝！+")}${winnerScore}</div>` : ""}
    `;
    resultsContent.appendChild(resultItem);
  });
}

/**
 * Reset round
 */
function resetRound() {
  if (
    !confirm(
      getLocalizedText(
        "Reset current round?",
        "確定要重置當前回合嗎？"
      )
    )
  ) {
    return;
  }

  players.forEach((p) => p.reset());
  currentRound = null;
  resultsSection.style.display = "none";

  triggerAutoSave();
  updateUI();
}

/**
 * Start new round
 */
function startNewRound() {
  if (!currentRound) {
    alert(
      getLocalizedText(
        "Please calculate scores first",
        "請先計算分數"
      )
    );
    return;
  }

  // Save current round to history
  rounds.push({
    ...currentRound,
    roundNumber: rounds.length + 1,
  });

  // Reset players for next round
  players.forEach((p) => p.reset());
  currentRound = null;
  resultsSection.style.display = "none";

  triggerAutoSave();
  updateUI();
  updateRoundsHistory();
}

/**
 * Update rounds history
 */
function updateRoundsHistory() {
  if (!roundsList) return;

  if (rounds.length === 0) {
    roundsHistory.style.display = "none";
    return;
  }

  roundsHistory.style.display = "block";
  roundsList.innerHTML = "";

  rounds.forEach((round) => {
    const roundItem = document.createElement("div");
    roundItem.className = "round-item";
    roundItem.innerHTML = `
      <div class="round-item-header">
        <div class="round-item-number">${getLocalizedText("Round", "回合")} ${round.roundNumber}</div>
        ${round.winner ? `<div style="color: #4caf50; font-weight: 600;">${getLocalizedText("Winner:", "獲勝者:")} ${escapeHtml(round.winner)} (+${round.winnerScore})</div>` : ""}
      </div>
      <div class="round-item-scores">
        ${round.scores
          .map(
            (s) => `
          <div class="round-item-score">
            <span>${escapeHtml(s.player)}</span>
            <span class="${s.score > 0 ? "negative" : ""}">${s.score > 0 ? "-" : ""}${Math.abs(s.score)}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    roundsList.appendChild(roundItem);
  });

  // Update settlement
  updateSettlement();
}

/**
 * Update settlement (total scores)
 */
function updateSettlement() {
  if (!settlementSection || !settlementContent) return;

  if (rounds.length === 0) {
    settlementSection.style.display = "none";
    return;
  }

  settlementSection.style.display = "block";

  // Calculate total scores for each player
  const totalScores = {};
  const playerNames = new Set();

  // Get all player names from all rounds
  rounds.forEach((round) => {
    if (round.scores) {
      round.scores.forEach((s) => {
        playerNames.add(s.player);
        if (!totalScores[s.player]) {
          totalScores[s.player] = 0;
        }
        // s.score is the remaining tiles score (positive number)
        // For losers: subtract their remaining tiles score (negative points)
        // For winner: add winner bonus (positive points from other players' remaining tiles)
        if (s.player === round.winner) {
          totalScores[s.player] += round.winnerScore || 0;
        } else {
          totalScores[s.player] -= s.score; // Subtract remaining tiles score
        }
      });
    }
  });

  // Sort players by total score (highest first)
  const sortedPlayers = Array.from(playerNames).sort(
    (a, b) => totalScores[b] - totalScores[a]
  );

  settlementContent.innerHTML = "";

  sortedPlayers.forEach((playerName, index) => {
    const totalScore = totalScores[playerName];
    const rank = index + 1;
    const settlementItem = document.createElement("div");
    settlementItem.className = `settlement-item rank-${rank} ${totalScore >= 0 ? "positive" : "negative"}`;
    
    // Get rank badge
    let rankBadge = "";
    if (rank === 1) {
      rankBadge = "🥇";
    } else if (rank === 2) {
      rankBadge = "🥈";
    } else if (rank === 3) {
      rankBadge = "🥉";
    } else {
      rankBadge = `<span class="rank-number">${rank}</span>`;
    }

    settlementItem.innerHTML = `
      <div class="settlement-item-content">
        <div class="settlement-rank-badge">${rankBadge}</div>
        <div class="settlement-item-info">
          <div class="settlement-item-name" title="${escapeHtml(playerName)}">${escapeHtml(playerName)}</div>
          <div class="settlement-item-score ${totalScore >= 0 ? "positive" : "negative"}">
            ${totalScore >= 0 ? "+" : ""}${totalScore}
          </div>
        </div>
      </div>
    `;
    settlementContent.appendChild(settlementItem);
  });
}

/**
 * Update UI
 */
function updateUI() {
  updateCurrentSlotInfo();
  updatePlayerList();
  updatePlayerScoringAreas();
  updateRoundsHistory();
}

/**
 * Update current slot info
 */
function updateCurrentSlotInfo() {
  if (!currentSlotInfo) return;

  const currentSlot = slotManager.slots.find(
    (s) => s.id === slotManager.currentSlotId
  );
  if (currentSlot) {
    const nameSpan = currentSlotInfo.querySelector(".slot-name");
    nameSpan.textContent = currentSlot.name;
  } else {
    const nameSpan = currentSlotInfo.querySelector(".slot-name");
    nameSpan.textContent = getLocalizedText("No game selected", "未選擇遊戲");
  }
}

/**
 * Update player list
 */
function updatePlayerList() {
  if (!playerList) return;

  playerList.innerHTML = "";

  players.forEach((player) => {
    const playerItem = document.createElement("div");
    playerItem.className = "player-item";
    playerItem.innerHTML = `
      <div class="player-item-name">${escapeHtml(player.name)}</div>
      <button class="btn-delete" onclick="handleDeletePlayer('${escapeHtml(player.name)}')">
        ${getLocalizedText("Delete", "刪除")}
      </button>
    `;
    playerList.appendChild(playerItem);
  });
}

/**
 * Update player scoring areas
 */
function updatePlayerScoringAreas() {
  if (!playerScoringAreas) return;

  playerScoringAreas.innerHTML = "";

  players.forEach((player) => {
    updatePlayerScoringArea(player);
  });
}

/**
 * Update single player scoring area
 */
function updatePlayerScoringArea(player) {
  if (!playerScoringAreas) return;

  // Remove existing area if exists
  const existing = playerScoringAreas.querySelector(
    `[data-player="${escapeHtml(player.name)}"]`
  );
  if (existing) {
    existing.remove();
  }

  const area = document.createElement("div");
  area.className = "player-scoring-area";
  area.setAttribute("data-player", player.name);

  // Tile buttons
  const tileButtons = document.createElement("div");
  tileButtons.className = "tile-buttons";
  for (let i = 1; i <= 13; i++) {
    const btnContainer = document.createElement("div");
    btnContainer.className = "tile-btn-container";
    
    const btn = document.createElement("button");
    btn.className = "tile-btn";
    btn.textContent = i;
    btn.onclick = () => updateTileCount(player.name, i.toString(), 1);
    
    const minusBtn = document.createElement("button");
    minusBtn.className = "tile-btn-minus";
    minusBtn.textContent = "−";
    minusBtn.onclick = () => updateTileCount(player.name, i.toString(), -1);
    
    const countDisplay = document.createElement("span");
    countDisplay.className = "tile-count";
    const count = player.tiles[i] || 0;
    countDisplay.textContent = count;
    if (count > 0) {
      btnContainer.classList.add("has-value");
    }
    
    btnContainer.appendChild(minusBtn);
    btnContainer.appendChild(btn);
    btnContainer.appendChild(countDisplay);
    tileButtons.appendChild(btnContainer);
  }
  // Joker button
  const jokerContainer = document.createElement("div");
  jokerContainer.className = "tile-btn-container";
  
  const jokerBtn = document.createElement("button");
  jokerBtn.className = "tile-btn joker";
  jokerBtn.textContent = getLocalizedText("J", "百");
  jokerBtn.onclick = () => updateTileCount(player.name, "joker", 1);
  
  const jokerMinusBtn = document.createElement("button");
  jokerMinusBtn.className = "tile-btn-minus joker";
  jokerMinusBtn.textContent = "−";
  jokerMinusBtn.onclick = () => updateTileCount(player.name, "joker", -1);
  
  const jokerCountDisplay = document.createElement("span");
  jokerCountDisplay.className = "tile-count";
  const jokerCount = player.jokers || 0;
  jokerCountDisplay.textContent = jokerCount;
  if (jokerCount > 0) {
    jokerContainer.classList.add("has-value", "has-joker-value");
  }
  
  jokerContainer.appendChild(jokerMinusBtn);
  jokerContainer.appendChild(jokerBtn);
  jokerContainer.appendChild(jokerCountDisplay);
  tileButtons.appendChild(jokerContainer);

  // Tile count display
  const countDisplay = document.createElement("div");
  countDisplay.className = "tile-count-display";
  const totalTiles = player.getTotalTiles();
  const totalSpan = document.createElement("span");
  totalSpan.textContent = `${getLocalizedText("Total tiles:", "總牌數:")} ${totalTiles}`;
  const scoreSpan = document.createElement("span");
  scoreSpan.textContent = `${getLocalizedText("Score:", "分數:")} ${calculatePlayerScore(player)}`;
  countDisplay.appendChild(totalSpan);
  countDisplay.appendChild(scoreSpan);

  // Title
  const title = document.createElement("h3");
  title.textContent = player.name;

  // Assemble area
  area.appendChild(title);
  area.appendChild(tileButtons);
  area.appendChild(countDisplay);

  playerScoringAreas.appendChild(area);
}

/**
 * Update tile count display for a player
 */
function updateTileCountDisplay(player) {
  const area = playerScoringAreas.querySelector(
    `[data-player="${escapeHtml(player.name)}"]`
  );
  if (!area) return;

  // Update number tile counts
  for (let i = 1; i <= 13; i++) {
    const container = area.querySelector(
      `.tile-btn-container:nth-child(${i})`
    );
    const countDisplay = container?.querySelector(".tile-count");
    if (container && countDisplay) {
      const count = player.tiles[i] || 0;
      countDisplay.textContent = count;
      // Update has-value class
      if (count > 0) {
        container.classList.add("has-value");
      } else {
        container.classList.remove("has-value");
      }
    }
  }

  // Update joker count
  const jokerContainer = area.querySelector(
    `.tile-btn-container:last-child`
  );
  const jokerCountDisplay = jokerContainer?.querySelector(".tile-count");
  if (jokerContainer && jokerCountDisplay) {
    const jokerCount = player.jokers || 0;
    jokerCountDisplay.textContent = jokerCount;
    // Update has-value class
    if (jokerCount > 0) {
      jokerContainer.classList.add("has-value", "has-joker-value");
    } else {
      jokerContainer.classList.remove("has-value", "has-joker-value");
    }
  }

  // Update total tiles and score display
  const countDisplay = area.querySelector(".tile-count-display");
  if (countDisplay) {
    const totalTiles = player.getTotalTiles();
    const totalSpan = countDisplay.querySelector("span:first-child");
    const scoreSpan = countDisplay.querySelector("span:last-child");
    if (totalSpan) {
      totalSpan.textContent = `${getLocalizedText("Total tiles:", "總牌數:")} ${totalTiles}`;
    }
    if (scoreSpan) {
      scoreSpan.textContent = `${getLocalizedText("Score:", "分數:")} ${calculatePlayerScore(player)}`;
    }
  }
}

/**
 * Slot modal functions
 */
let currentSlotModalAction = null;
let currentSlotModalSlotId = null;

function openSlotModal(slotId = null, action = "create") {
  currentSlotModalAction = action;
  currentSlotModalSlotId = slotId;
  const modal = document.getElementById("slotModal");
  const title = document.getElementById("slotModalTitle");
  const input = document.getElementById("slotNameInput");

  if (action === "create") {
    title.textContent = getLocalizedText("New Game", "新遊戲");
    input.value = "";
  } else if (action === "rename") {
    const slot = slotManager.slots.find((s) => s.id === slotId);
    title.textContent = getLocalizedText("Rename Game", "重命名遊戲");
    input.value = slot ? slot.name : "";
  }

  modal.style.display = "flex";
  input.focus();
}

function closeSlotModal() {
  document.getElementById("slotModal").style.display = "none";
  currentSlotModalAction = null;
  currentSlotModalSlotId = null;
}

function handleSaveSlot() {
  const input = document.getElementById("slotNameInput");
  const name = input.value.trim();

  if (!name) {
    alert(getLocalizedText("Please enter a name", "請輸入名稱"));
    return;
  }

  if (currentSlotModalAction === "create") {
    const slot = slotManager.createSlot(name);
    loadSlot(slotManager.switchSlot(slot.id));
  } else if (currentSlotModalAction === "rename") {
    slotManager.renameSlot(currentSlotModalSlotId, name);
  }

  updateSlotList();
  updateUI();
  closeSlotModal();
}

function handleRenameSlot(slotId) {
  openSlotModal(slotId, "rename");
}

function handleDuplicateSlot(slotId) {
  const newSlot = slotManager.duplicateSlot(slotId);
  if (newSlot) {
    loadSlot(slotManager.switchSlot(newSlot.id));
    updateSlotList();
    updateUI();
  }
}

function handleDeleteSlot(slotId) {
  if (
    confirm(
      getLocalizedText(
        "Delete this game?",
        "確定要刪除這個遊戲嗎？"
      )
    )
  ) {
    slotManager.deleteSlot(slotId);
    if (slotManager.slots.length > 0) {
      loadSlot(slotManager.switchSlot(slotManager.slots[0].id));
    } else {
      players = [];
      rounds = [];
      currentRound = null;
    }
    updateSlotList();
    updateUI();
  }
}

/**
 * Share functions
 */
function openShareModal() {
  if (!slotManager.currentSlotId) {
    alert(getLocalizedText("No game selected", "未選擇遊戲"));
    return;
  }

  const link = generateShareLink();
  const input = document.getElementById("shareLinkInput");
  input.value = link;
  document.getElementById("shareModal").style.display = "flex";
}

function closeShareModal() {
  document.getElementById("shareModal").style.display = "none";
}

function generateShareLink() {
  const currentSlot = slotManager.slots.find(
    (s) => s.id === slotManager.currentSlotId
  );
  if (!currentSlot) return "";

  // Save current state first
  saveCurrentSlot();

  // Get updated slot
  const slot = slotManager.slots.find((s) => s.id === slotManager.currentSlotId);
  const encoded = btoa(JSON.stringify(slot));
  const url = new URL(window.location.href);
  url.searchParams.set("slot", encoded);
  return url.toString();
}

async function copyShareLink() {
  const input = document.getElementById("shareLinkInput");
  try {
    await navigator.clipboard.writeText(input.value);
    const btn = document.getElementById("copyShareLinkBtn");
    const originalText = btn.textContent;
    btn.textContent = getLocalizedText("Copied!", "已複製！");
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  } catch (e) {
    console.error("Failed to copy:", e);
    // Fallback: select text
    input.select();
    document.execCommand("copy");
  }
}

function importSlotFromURL(slotData) {
  try {
    const slot = JSON.parse(atob(slotData));
    // Check if slot already exists
    const existing = slotManager.slots.find((s) => s.id === slot.id);
    if (existing) {
      // Update existing slot
      Object.assign(existing, slot);
      existing.updatedAt = Date.now();
    } else {
      // Create new slot
      slotManager.slots.push(slot);
    }
    slotManager.saveAllSlots();
    loadSlot(slotManager.switchSlot(slot.id));
    updateSlotList();
    updateUI();
  } catch (e) {
    console.error("Failed to import slot from URL:", e);
    alert(
      getLocalizedText(
        "Failed to import game data",
        "導入遊戲數據失敗"
      )
    );
  }
}

/**
 * Utility functions
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getLocalizedText(en, zh) {
  const locale = document.documentElement.lang || "en";
  return (locale === "zh-HK" || locale === "zh-Hant") ? zh : en;
}

// Make functions available globally for onclick handlers
window.handleDeletePlayer = handleDeletePlayer;
window.handleRenameSlot = handleRenameSlot;
window.handleDuplicateSlot = handleDuplicateSlot;
window.handleDeleteSlot = handleDeleteSlot;

/**
 * Update placeholders for localization
 */
function updatePlaceholders() {
  const locale = document.documentElement.lang || "en";
  const placeholders = document.querySelectorAll(
    "[data-placeholder-en], [data-placeholder-zh-HK]"
  );
  placeholders.forEach((el) => {
    const en = el.getAttribute("data-placeholder-en");
    const zh = el.getAttribute("data-placeholder-zh-HK");
    el.placeholder = (locale === "zh-HK" || locale === "zh-Hant") ? zh : en;
  });
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init();
    updatePlaceholders();
  });
} else {
  init();
  updatePlaceholders();
}

// Update placeholders when locale changes
document.addEventListener("localechange", () => {
  updatePlaceholders();
  // Update all dynamic content when locale changes
  if (slotManager) {
    updateSlotList();
    updateUI();
  }
});

// Also listen for lang attribute changes (from locale-menu)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (
      mutation.type === "attributes" &&
      mutation.attributeName === "lang"
    ) {
      updatePlaceholders();
      if (slotManager) {
        updateUI();
      }
    }
  });
});

// Observe lang attribute changes
if (document.documentElement) {
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
}

