/**
 * General Scoreboard — script
 * localStorage, four scoring modes, custom numpad with event delegation
 */

const STORAGE_KEY = "playground_scoreboard_data";

const messages = {
  en: {
    scoreUpdated: "Score updated",
    invalidNumber: "Please enter a valid number",
    selectPlayer: "Please select a player",
    clearConfirm: "Clear all data and reset?",
  },
  "zh-HK": {
    scoreUpdated: "已更新分數",
    invalidNumber: "請輸入有效數字",
    selectPlayer: "請選擇玩家",
    clearConfirm: "確定清除所有紀錄並重置？",
  },
};

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function t(key) {
  const locale = getLocale();
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

// ---------- Data ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.players) && data.players.length >= 2) return data;
  } catch (_) {}
  return null;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- DOM refs ----------
const initSection = document.getElementById("initSection");
const mainSection = document.getElementById("mainSection");
const playerCountInput = document.getElementById("playerCount");
const startingScoreInput = document.getElementById("startingScore");
const playerNamesContainer = document.getElementById("playerNamesContainer");
const startScoreboardBtn = document.getElementById("startScoreboardBtn");
const playerCardsEl = document.getElementById("playerCards");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const clearDataBtn = document.getElementById("clearDataBtn");
const numpadOverlay = document.getElementById("numpadOverlay");
const numpadBackdrop = document.getElementById("numpadBackdrop");
const numpadPanel = document.getElementById("numpadPanel");

// ---------- State ----------
let state = {
  players: [],
  startingScore: 0,
};

// ---------- Init section ----------
function renderPlayerNameInputs(count) {
  const n = Math.max(2, Math.min(20, parseInt(count, 10) || 2));
  playerNamesContainer.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const div = document.createElement("div");
    div.className = "form-group";
    const label = document.createElement("label");
    label.setAttribute("for", `playerName${i}`);
    label.textContent = (getLocale() === "zh-HK" ? "玩家" : "Player") + ` ${i}:`;
    const input = document.createElement("input");
    input.type = "text";
    input.id = `playerName${i}`;
    input.placeholder = `Player ${i}`;
    input.setAttribute("data-placeholder-en", `Player ${i}`);
    input.setAttribute("data-placeholder-zh-Hant", `玩家 ${i}`);
    div.appendChild(label);
    div.appendChild(input);
    playerNamesContainer.appendChild(div);
  }
}

function startScoreboard() {
  const count = Math.max(2, Math.min(20, parseInt(playerCountInput.value, 10) || 2));
  const startingScore = parseScore(startingScoreInput.value);
  const names = [];
  for (let i = 1; i <= count; i++) {
    const input = document.getElementById(`playerName${i}`);
    const name = (input && input.value.trim()) || `Player ${i}`;
    names.push(name);
  }
  state = {
    players: names.map((name, idx) => ({
      id: `p${Date.now()}_${idx}`,
      name,
      score: startingScore,
    })),
    startingScore,
  };
  saveData(state);
  showMain();
  renderAll();
}

// ---------- Main section ----------
function showInit() {
  if (initSection) initSection.hidden = false;
  if (mainSection) mainSection.hidden = true;
  const count = Math.max(2, parseInt(playerCountInput.value, 10) || 4);
  renderPlayerNameInputs(count);
}

function showMain() {
  if (initSection) initSection.hidden = true;
  if (mainSection) mainSection.hidden = false;
}

function renderAll() {
  renderPlayerCards();
  fillModeSelects();
  renderModeA();
  renderModeB();
}

function renderPlayerCards() {
  if (!playerCardsEl) return;
  playerCardsEl.innerHTML = state.players
    .map(
      (p) => `
    <div class="player-card" data-player-id="${p.id}">
      <div class="player-card-name">${escapeHtml(p.name)}</div>
      <div class="player-card-score score-value" data-player-id="${p.id}">${p.score}</div>
    </div>
  `
    )
    .join("");
}

function fillModeSelects() {
  const options = state.players
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");
  const selects = [
    "modeAWinner",
    "modeBLoser",
    "modeCFrom",
    "modeCTo",
    "modeDPlayer",
  ];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      const current = el.value;
      el.innerHTML = options;
      const stillExists = state.players.some((p) => p.id === current);
      if (stillExists) el.value = current;
    }
  });
}

function renderModeA() {
  const winnerSelect = document.getElementById("modeAWinner");
  const container = document.getElementById("modeALosers");
  if (!winnerSelect || !container) return;
  const winnerId = winnerSelect.value;
  container.innerHTML = state.players
    .filter((p) => p.id !== winnerId)
    .map(
      (p) => `
    <div class="form-group">
      <label>${escapeHtml(p.name)} <span data-en="(loses)" data-zh-HK="(輸)">(loses)</span>:</label>
      <input type="text" class="score-input" data-mode-a-loser="${p.id}" readonly inputmode="none" placeholder="0" />
    </div>
  `
    )
    .join("");
}

function renderModeB() {
  const loserSelect = document.getElementById("modeBLoser");
  const container = document.getElementById("modeBWinners");
  if (!loserSelect || !container) return;
  const loserId = loserSelect.value;
  container.innerHTML = state.players
    .filter((p) => p.id !== loserId)
    .map(
      (p) => `
    <div class="form-group">
      <label>${escapeHtml(p.name)} <span data-en="(wins)" data-zh-HK="(贏)">(wins)</span>:</label>
      <input type="text" class="score-input" data-mode-b-winner="${p.id}" readonly inputmode="none" placeholder="0" />
    </div>
  `
    )
    .join("");
}

// ---------- Mode calculations ----------
function parseScore(str) {
  if (str === "" || str === "-") return NaN;
  const n = parseFloat(String(str).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function runModeA() {
  const winnerId = document.getElementById("modeAWinner")?.value;
  if (!winnerId) {
    showToast(t("selectPlayer"));
    return;
  }
  const loserInputs = document.querySelectorAll(
    '#modeALosers input[data-mode-a-loser]'
  );
  let total = 0;
  const updates = [];
  for (const input of loserInputs) {
    const pid = input.getAttribute("data-mode-a-loser");
    const val = parseScore(input.value);
    const amount = Number.isFinite(val) ? val : 0;
    total += amount;
    updates.push({ id: pid, delta: -amount });
  }
  updates.push({ id: winnerId, delta: total });
  applyUpdates(updates);
  loserInputs.forEach((i) => (i.value = ""));
  showToast(t("scoreUpdated"));
}

function runModeB() {
  const loserId = document.getElementById("modeBLoser")?.value;
  if (!loserId) {
    showToast(t("selectPlayer"));
    return;
  }
  const winnerInputs = document.querySelectorAll(
    '#modeBWinners input[data-mode-b-winner]'
  );
  let total = 0;
  const updates = [];
  for (const input of winnerInputs) {
    const pid = input.getAttribute("data-mode-b-winner");
    const val = parseScore(input.value);
    const amount = Number.isFinite(val) ? val : 0;
    total += amount;
    updates.push({ id: pid, delta: amount });
  }
  updates.push({ id: loserId, delta: -total });
  applyUpdates(updates);
  winnerInputs.forEach((i) => (i.value = ""));
  showToast(t("scoreUpdated"));
}

function runModeC() {
  const fromId = document.getElementById("modeCFrom")?.value;
  const toId = document.getElementById("modeCTo")?.value;
  const amountEl = document.getElementById("modeCAmount");
  if (!fromId || !toId) {
    showToast(t("selectPlayer"));
    return;
  }
  const amount = parseScore(amountEl?.value ?? "");
  if (!Number.isFinite(amount) || amount === 0) {
    showToast(t("invalidNumber"));
    return;
  }
  applyUpdates(
    [
      { id: fromId, delta: -amount },
      { id: toId, delta: amount },
    ]
  );
  if (amountEl) amountEl.value = "";
  showToast(t("scoreUpdated"));
}

function runModeD() {
  const playerId = document.getElementById("modeDPlayer")?.value;
  const pointsEl = document.getElementById("modeDPoints");
  if (!playerId) {
    showToast(t("selectPlayer"));
    return;
  }
  const points = parseScore(pointsEl?.value ?? "");
  if (!Number.isFinite(points)) {
    showToast(t("invalidNumber"));
    return;
  }
  applyUpdates([{ id: playerId, delta: points }]);
  if (pointsEl) pointsEl.value = "";
  showToast(t("scoreUpdated"));
}

function applyUpdates(updates) {
  for (const { id, delta } of updates) {
    const p = state.players.find((x) => x.id === id);
    if (p) p.score += delta;
  }
  saveData(state);
  renderPlayerCards();
  flashScores(updates.map((u) => u.id));
}

function flashScores(playerIds) {
  playerIds.forEach((id) => {
    const el = document.querySelector(
      `.player-card-score.score-value[data-player-id="${id}"]`
    );
    if (el) {
      el.classList.remove("score-update");
      el.offsetHeight;
      el.classList.add("score-update");
      setTimeout(() => el.classList.remove("score-update"), 400);
    }
  });
}

// ---------- Add player ----------
function addPlayer() {
  const name = prompt(getLocale() === "zh-HK" ? "新玩家名稱：" : "New player name:", "Player " + (state.players.length + 1));
  if (name == null || !name.trim()) return;
  state.players.push({
    id: `p${Date.now()}_${state.players.length}`,
    name: name.trim(),
    score: state.startingScore,
  });
  saveData(state);
  renderAll();
  showToast(getLocale() === "zh-HK" ? "已新增玩家" : "Player added");
}

// ---------- Clear data ----------
function clearData() {
  if (!confirm(t("clearConfirm"))) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { players: [], startingScore: 0 };
  document.getElementById("playerCount").value = 4;
  document.getElementById("startingScore").value = "0";
  showInit();
  renderPlayerNameInputs(4);
}

// ---------- Tabs ----------
function bindTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      tabBtns.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-mode") === mode);
        b.setAttribute("aria-selected", b.getAttribute("data-mode") === mode ? "true" : "false");
      });
      panels.forEach((panel) => {
        const id = panel.id;
        const isA = id === "panelA" && mode === "a";
        const isB = id === "panelB" && mode === "b";
        const isC = id === "panelC" && mode === "c";
        const isD = id === "panelD" && mode === "d";
        const active = isA || isB || isC || isD;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
      if (mode === "a") renderModeA();
      if (mode === "b") renderModeB();
    });
  });
}

// ---------- Toast ----------
let toastTimer = null;

function showToast(text) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 2000);
}

// ---------- Custom Numpad ----------
let currentScoreInput = null;

function openNumpad(inputEl) {
  currentScoreInput = inputEl;
  if (numpadOverlay) {
    numpadOverlay.hidden = false;
    numpadOverlay.classList.add("is-open");
    numpadOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeNumpad() {
  currentScoreInput = null;
  if (numpadOverlay) {
    numpadOverlay.classList.remove("is-open");
    numpadOverlay.hidden = true;
    numpadOverlay.setAttribute("aria-hidden", "true");
  }
}

function numpadAppend(char) {
  if (!currentScoreInput) return;
  const el = currentScoreInput;
  const cur = el.value;
  if (char === "-") {
    if (cur === "" || cur === "-") {
      el.value = cur === "-" ? "" : "-";
      return;
    }
    return;
  }
  if (char === "." && cur.includes(".")) return;
  el.value = cur + char;
}

function numpadBackspace() {
  if (!currentScoreInput) return;
  const el = currentScoreInput;
  el.value = currentScoreInput.value.slice(0, -1);
}

function numpadQuick(action) {
  if (!currentScoreInput) return;
  const el = currentScoreInput;
  const n = parseScore(el.value);
  const base = Number.isFinite(n) ? n : 0;
  if (action === "+/-") {
    el.value = base === 0 ? "-" : String(-base);
    return;
  }
  const add = parseInt(action.slice(1), 10);
  if (Number.isFinite(add)) {
    el.value = String(base + add);
  }
}

function bindNumpad() {
  if (numpadBackdrop) {
    numpadBackdrop.addEventListener("click", () => closeNumpad());
  }

  document.querySelectorAll(".numpad-key").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const key = btn.getAttribute("data-key");
      if (key === "enter") {
        closeNumpad();
        return;
      }
      if (key === "backspace") {
        numpadBackspace();
        return;
      }
      numpadAppend(key);
    });
  });

  document.querySelectorAll(".numpad-quick-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      numpadQuick(btn.getAttribute("data-quick"));
    });
  });

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList && target.classList.contains("score-input")) {
      e.preventDefault();
      openNumpad(target);
    }
  });

  document.addEventListener("focusin", (e) => {
    if (e.target.classList && e.target.classList.contains("score-input")) {
      e.preventDefault();
      openNumpad(e.target);
    }
  });
}

// ---------- Mode A/B select change re-render ----------
function bindModeSelects() {
  const modeAWinner = document.getElementById("modeAWinner");
  const modeBLoser = document.getElementById("modeBLoser");
  if (modeAWinner) {
    modeAWinner.addEventListener("change", () => renderModeA());
  }
  if (modeBLoser) {
    modeBLoser.addEventListener("change", () => renderModeB());
  }
}

// ---------- Buttons ----------
function bindButtons() {
  if (startScoreboardBtn) {
    startScoreboardBtn.addEventListener("click", startScoreboard);
  }
  if (addPlayerBtn) {
    addPlayerBtn.addEventListener("click", addPlayer);
  }
  if (clearDataBtn) {
    clearDataBtn.addEventListener("click", clearData);
  }
  if (playerCountInput) {
    playerCountInput.addEventListener("change", () =>
      renderPlayerNameInputs(playerCountInput.value)
    );
    playerCountInput.addEventListener("input", () =>
      renderPlayerNameInputs(playerCountInput.value)
    );
  }

  document.getElementById("modeACalcBtn")?.addEventListener("click", runModeA);
  document.getElementById("modeBCalcBtn")?.addEventListener("click", runModeB);
  document.getElementById("modeCTransferBtn")?.addEventListener("click", runModeC);
  document.getElementById("modeDApplyBtn")?.addEventListener("click", runModeD);
}

// ---------- Init ----------
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function init() {
  const data = loadData();
  if (data) {
    state = data;
    showMain();
    renderAll();
  } else {
    showInit();
  }
  bindTabs();
  bindModeSelects();
  bindButtons();
  bindNumpad();
}

init();
