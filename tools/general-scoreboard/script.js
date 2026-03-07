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
    clearHistoryConfirm: "Clear all history?",
    historyEmpty: "No records yet.",
    sessionNameRequired: "Please enter a game/session name.",
    resetConfirm: "Reset this game? Players and history will be cleared.",
    deleteConfirm: "Delete this game? This cannot be undone.",
    noSessions: "No games yet. Create one below.",
    zeroSumError: "Scores are not balanced! Total score does not match initial total. Please check the history for errors.",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    editRecord: "Edit record",
    remark: "Remark",
  },
  "zh-HK": {
    scoreUpdated: "已更新分數",
    invalidNumber: "請輸入有效數字",
    selectPlayer: "請選擇玩家",
    clearConfirm: "確定清除所有紀錄並重置？",
    clearHistoryConfirm: "確定清空所有紀錄？",
    historyEmpty: "尚無紀錄。",
    sessionNameRequired: "請輸入局名／場次名稱。",
    resetConfirm: "確定重置本局？玩家與紀錄將被清空。",
    deleteConfirm: "確定刪除此局？無法復原。",
    noSessions: "尚無局次，請於下方建立。",
    zeroSumError: "分數不平衡！總分數與初始總分數不符，請檢查歷史紀錄是否有誤。",
    edit: "編輯",
    save: "儲存",
    cancel: "取消",
    editRecord: "編輯紀錄",
    remark: "備註",
  },
};

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function t(key) {
  const locale = getLocale();
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

// ---------- Data (multi-session) ----------
function ensurePlayerInitialScores(session) {
  const start = session.startingScore ?? 0;
  (session.players || []).forEach((p) => {
    if (p.initialScore === undefined) p.initialScore = start;
  });
}

function migrateOldToNew(oldData) {
  const name = getLocale() === "zh-HK" ? "已儲存的遊戲" : "Saved game";
  const startingScore = oldData.startingScore ?? 0;
  const players = (oldData.players || []).map((p) => ({
    ...p,
    initialScore: p.initialScore !== undefined ? p.initialScore : startingScore,
  }));
  const session = {
    id: String(Date.now()),
    name,
    players,
    startingScore,
    history: Array.isArray(oldData.history) ? oldData.history : [],
    createdAt: new Date().toISOString(),
  };
  return {
    sessions: [session],
    currentSessionId: session.id,
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    if (Array.isArray(data.players) && data.players.length >= 2) {
      return migrateOldToNew(data);
    }
    if (data.sessions && Array.isArray(data.sessions)) {
      data.sessions.forEach(ensurePlayerInitialScores);
      const currentSessionId = data.currentSessionId || null;
      return { sessions: data.sessions, currentSessionId };
    }
  } catch (_) {}
  return null;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCurrentSession() {
  if (!state.sessions || !state.currentSessionId) return null;
  return state.sessions.find((s) => s.id === state.currentSessionId) || null;
}

/** In mode E we store scores ×10 (one decimal). Returns 10 or 1. */
function getScoreScale(session) {
  return session && session.scoreScale === 10 ? 10 : 1;
}

/** Format score for display (e.g. 85 → "8.5" when scale 10). */
function formatScoreDisplay(score, session) {
  const scale = getScoreScale(session);
  const n = Number(score) || 0;
  if (scale === 10) return (n / 10).toFixed(1);
  return String(n);
}

// ---------- DOM refs ----------
const dashboardSection = document.getElementById("dashboardSection");
const initSection = document.getElementById("initSection");
const mainSection = document.getElementById("mainSection");
const sessionNameInput = document.getElementById("sessionName");
const playerCountInput = document.getElementById("playerCount");
const startingScoreInput = document.getElementById("startingScore");
const playerNamesContainer = document.getElementById("playerNamesContainer");
const startScoreboardBtn = document.getElementById("startScoreboardBtn");
const playerCardsEl = document.getElementById("playerCards");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const numpadOverlay = document.getElementById("numpadOverlay");
const numpadBackdrop = document.getElementById("numpadBackdrop");
const numpadPanel = document.getElementById("numpadPanel");

// ---------- State ----------
let state = {
  sessions: [],
  currentSessionId: null,
};

/** When starting from Init: if set, we update this session instead of creating new */
let initResettingSessionId = null;

// Selected player IDs per mode (for chip UI)
let selectedModeAWinner = null;
let selectedModeBLoser = null;
let selectedModeCFrom = null;
let selectedModeCTo = null;
let selectedModeDPlayer = null;
let selectedModeEWinner = null;
let selectedModeESelfDraw = true;
let selectedModeEDiscarder = null;

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
  const name = (sessionNameInput && sessionNameInput.value.trim()) || "";
  if (!name) {
    showToast(t("sessionNameRequired"));
    return;
  }
  const count = Math.max(2, Math.min(20, parseInt(playerCountInput.value, 10) || 2));
  const startingScore = parseScore(startingScoreInput.value);
  const names = [];
  for (let i = 1; i <= count; i++) {
    const input = document.getElementById(`playerName${i}`);
    names.push((input && input.value.trim()) || `Player ${i}`);
  }
  const players = names.map((n, idx) => ({
    id: `p${Date.now()}_${idx}`,
    name: n,
    score: startingScore,
    initialScore: startingScore,
  }));
  const now = new Date().toISOString();

  if (initResettingSessionId) {
    const session = state.sessions.find((s) => s.id === initResettingSessionId);
    if (session) {
      session.name = name;
      session.players = players;
      session.startingScore = startingScore;
      session.history = [];
      state.currentSessionId = session.id;
    }
    initResettingSessionId = null;
  } else {
    const session = {
      id: String(Date.now()),
      name,
      players,
      startingScore,
      history: [],
      createdAt: now,
    };
    state.sessions = state.sessions || [];
    state.sessions.push(session);
    state.currentSessionId = session.id;
  }
  selectedModeAWinner = selectedModeBLoser = selectedModeCFrom = selectedModeCTo = selectedModeDPlayer = selectedModeEWinner = null;
  selectedModeESelfDraw = true;
  selectedModeEDiscarder = null;
  saveData(state);
  if (sessionNameInput) sessionNameInput.value = "";
  showMain();
  renderAll();
  renderHistory();
}

// ---------- Views ----------
function showDashboard() {
  if (dashboardSection) dashboardSection.hidden = false;
  if (initSection) initSection.hidden = true;
  if (mainSection) mainSection.hidden = true;
  const settlementSection = document.getElementById("settlementSection");
  if (settlementSection) settlementSection.hidden = true;
  state.currentSessionId = null;
  renderSessionList();
}

function showInit(forResetSessionId) {
  initResettingSessionId = forResetSessionId || null;
  if (dashboardSection) dashboardSection.hidden = true;
  if (initSection) initSection.hidden = false;
  if (mainSection) mainSection.hidden = true;
  const count = Math.max(2, parseInt(playerCountInput.value, 10) || 4);
  if (forResetSessionId) {
    const session = state.sessions.find((s) => s.id === forResetSessionId);
    if (sessionNameInput && session) sessionNameInput.value = session.name || "";
  } else if (sessionNameInput) {
    sessionNameInput.value = "";
  }
  renderPlayerNameInputs(count);
}

function showMain() {
  if (dashboardSection) dashboardSection.hidden = true;
  if (initSection) initSection.hidden = true;
  if (mainSection) mainSection.hidden = false;
  const title = document.getElementById("currentSessionTitle");
  const session = getCurrentSession();
  if (title) title.textContent = session ? session.name : "—";
  updateMainActionsForSettled();
  renderAll();
  renderHistory();
}

function updateMainActionsForSettled() {
  const session = getCurrentSession();
  const settled = session && session.isSettled === true;
  const addBtn = document.getElementById("addPlayerBtn");
  const resetBtn = document.getElementById("resetSessionBtn");
  const settlementBtn = document.getElementById("settlementBtn");
  if (addBtn) addBtn.hidden = !!settled;
  if (resetBtn) resetBtn.hidden = !!settled;
  if (settlementBtn) settlementBtn.hidden = !!settled;
}

function renderSessionList() {
  const list = document.getElementById("sessionList");
  if (!list) return;
  const sessions = state.sessions || [];
  if (sessions.length === 0) {
    list.innerHTML = `<p class="session-list-empty">${t("noSessions")}</p>`;
    return;
  }
  const isZh = getLocale() === "zh-HK";
  const settledLabel = isZh ? "🏆 已完局" : "🏆 Settled";
  list.innerHTML = sessions
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((s) => {
      const dateStr = s.createdAt ? formatSessionDate(s.createdAt) : "";
      const metaParts = [dateStr, (s.players && s.players.length) ? `${s.players.length} players` : ""];
      const settled = s.isSettled === true;
      if (settled && s.players && s.players.length > 0) {
        const withNet = s.players.map((p) => ({ name: p.name, net: (Number(p.score) || 0) - (Number(p.initialScore) ?? 0) }));
        const top = withNet.sort((a, b) => b.net - a.net)[0];
        if (top && top.net > 0) metaParts.push(isZh ? `最大贏家：${top.name}` : `Winner: ${top.name}`);
        const count = (s.history && s.history.length) || 0;
        metaParts.push(isZh ? `${count} 筆紀錄` : `${count} records`);
      }
      const meta = metaParts.filter(Boolean).join(" · ");
      return `
        <button type="button" class="session-list-item ${settled ? "session-list-item-settled" : ""}" data-session-id="${escapeHtml(s.id)}">
          ${settled ? `<span class="session-list-item-badge">${settledLabel}</span>` : ""}
          <div class="session-list-item-name">${escapeHtml(s.name || "—")}</div>
          ${meta ? `<div class="session-list-item-meta">${escapeHtml(meta)}</div>` : ""}
        </button>
      `;
    })
    .join("");
  list.querySelectorAll(".session-list-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-session-id");
      if (id) openSession(id);
    });
  });
}

function formatSessionDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(getLocale() === "zh-HK" ? "zh-HK" : "en-GB", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch (_) {
    return "";
  }
}

function openSession(sessionId) {
  state.currentSessionId = sessionId;
  saveData(state);
  const session = getCurrentSession();
  if (session && session.isSettled === true) {
    mainSection.hidden = true;
    const settlementSection = document.getElementById("settlementSection");
    if (settlementSection) settlementSection.hidden = false;
    const nameEl = document.getElementById("settlementSessionName");
    if (nameEl) nameEl.textContent = session.name || "—";
    renderSettlement();
  } else {
    showMain();
  }
}

function backToDashboard() {
  showDashboard();
}

function resetSession() {
  const session = getCurrentSession();
  if (!session || !confirm(t("resetConfirm"))) return;
  session.players = [];
  session.history = [];
  saveData(state);
  selectedModeAWinner = selectedModeBLoser = selectedModeCFrom = selectedModeCTo = selectedModeDPlayer = selectedModeEWinner = null;
  selectedModeESelfDraw = true;
  selectedModeEDiscarder = null;
  showInit(session.id);
  renderPlayerNameInputs(4);
}

function deleteSession() {
  const session = getCurrentSession();
  if (!session || !confirm(t("deleteConfirm"))) return;
  state.sessions = (state.sessions || []).filter((s) => s.id !== session.id);
  if (state.currentSessionId === session.id) state.currentSessionId = state.sessions[0] ? state.sessions[0].id : null;
  saveData(state);
  if (state.sessions.length === 0) {
    showInit();
    renderPlayerNameInputs(4);
  } else {
    showDashboard();
  }
  showToast(getLocale() === "zh-HK" ? "已刪除此局" : "Game deleted");
}

function newGame() {
  initResettingSessionId = null;
  if (sessionNameInput) sessionNameInput.value = "";
  playerCountInput.value = 4;
  startingScoreInput.value = "0";
  showInit();
  renderPlayerNameInputs(4);
}

function renderAll() {
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  renderPlayerCards();
  if (players.length && selectedModeAWinner == null && selectedModeBLoser == null && selectedModeCFrom == null && selectedModeCTo == null && selectedModeDPlayer == null && selectedModeEWinner == null) {
    selectedModeAWinner = players[0].id;
    selectedModeBLoser = players[0].id;
    selectedModeCFrom = players[0].id;
    selectedModeCTo = players.length > 1 ? players[1].id : null;
    selectedModeDPlayer = players[0].id;
    selectedModeEWinner = players[0].id;
    selectedModeESelfDraw = true;
    selectedModeEDiscarder = null;
  }
  renderPlayerChipsAll();
  renderModeA();
  renderModeB();
  renderModeE();
  renderHistory();
}

function renderPlayerCards() {
  if (!playerCardsEl) return;
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  playerCardsEl.innerHTML = players
    .map((p) => {
      const scoreNum = Number(p.score) || 0;
      const initialNum = Number(p.initialScore) ?? 0;
      const scoreClass = scoreNum > initialNum ? "positive" : scoreNum < initialNum ? "negative" : "";
      return `
    <div class="player-card" data-player-id="${p.id}">
      <div class="player-card-name">${escapeHtml(p.name)}</div>
      <div class="player-card-score score-value ${scoreClass}" data-player-id="${p.id}">${formatScoreDisplay(p.score, session)}</div>
    </div>
  `;
    })
    .join("");
}

function getPlayerName(id) {
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  const p = players.find((x) => x.id === id);
  return p ? p.name : "";
}

function renderPlayerChipsForPlayers(containerId, selectedId, role, players) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = (players || [])
    .map(
      (p) =>
        `<button type="button" class="player-chip" data-player-id="${p.id}" data-role="${role}">${escapeHtml(p.name)}</button>`
    )
    .join("");
  container.querySelectorAll(".player-chip").forEach((btn) => {
    const id = btn.getAttribute("data-player-id");
    btn.classList.toggle("selected", id === selectedId);
    btn.addEventListener("click", () => {
      if (role === "modeEDiscarder") {
        selectedModeEDiscarder = id;
        renderPlayerChipsForPlayers(containerId, selectedModeEDiscarder, role, players);
        renderModeE();
      }
    });
  });
}

function renderPlayerChips(containerId, selectedId, role) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  container.innerHTML = players
    .map(
      (p) =>
        `<button type="button" class="player-chip" data-player-id="${p.id}" data-role="${role}">${escapeHtml(p.name)}</button>`
    )
    .join("");
  container.querySelectorAll(".player-chip").forEach((btn) => {
    const id = btn.getAttribute("data-player-id");
    btn.classList.toggle("selected", id === selectedId);
    btn.addEventListener("click", () => {
      if (role === "modeAWinner") {
        selectedModeAWinner = id;
        renderPlayerChips("modeAWinnerChips", selectedModeAWinner, "modeAWinner");
        renderModeA();
      } else if (role === "modeBLoser") {
        selectedModeBLoser = id;
        renderPlayerChips("modeBLoserChips", selectedModeBLoser, "modeBLoser");
        renderModeB();
      } else if (role === "modeCFrom") {
        selectedModeCFrom = id;
        renderPlayerChips("modeCFromChips", selectedModeCFrom, "modeCFrom");
        if (selectedModeCTo === id) selectedModeCTo = null;
        renderPlayerChips("modeCToChips", selectedModeCTo, "modeCTo");
      } else if (role === "modeCTo") {
        selectedModeCTo = id;
        renderPlayerChips("modeCToChips", selectedModeCTo, "modeCTo");
        if (selectedModeCFrom === id) selectedModeCFrom = null;
        renderPlayerChips("modeCFromChips", selectedModeCFrom, "modeCFrom");
      } else if (role === "modeDPlayer") {
        selectedModeDPlayer = id;
        renderPlayerChips("modeDPlayerChips", selectedModeDPlayer, "modeDPlayer");
      } else if (role === "modeEWinner") {
        selectedModeEWinner = id;
        renderPlayerChips("modeEWinnerChips", selectedModeEWinner, "modeEWinner");
        if (selectedModeEDiscarder === id) selectedModeEDiscarder = null;
        renderModeE();
      } else if (role === "modeEDiscarder") {
        selectedModeEDiscarder = id;
        renderPlayerChips("modeEDiscarderChips", selectedModeEDiscarder, "modeEDiscarder");
        renderModeE();
      }
    });
  });
}

function renderPlayerChipsAll() {
  renderPlayerChips("modeAWinnerChips", selectedModeAWinner, "modeAWinner");
  renderPlayerChips("modeBLoserChips", selectedModeBLoser, "modeBLoser");
  renderPlayerChips("modeCFromChips", selectedModeCFrom, "modeCFrom");
  renderPlayerChips("modeCToChips", selectedModeCTo, "modeCTo");
  renderPlayerChips("modeDPlayerChips", selectedModeDPlayer, "modeDPlayer");
  renderPlayerChips("modeEWinnerChips", selectedModeEWinner, "modeEWinner");
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  if (!selectedModeESelfDraw && players.length > 0) {
    const nonWinners = players.filter((p) => p.id !== selectedModeEWinner);
    renderPlayerChipsForPlayers("modeEDiscarderChips", selectedModeEDiscarder, "modeEDiscarder", nonWinners);
  }
  renderModeE();
}

function renderModeA() {
  const container = document.getElementById("modeALosers");
  if (!container) return;
  const winnerId = selectedModeAWinner;
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  container.innerHTML = players
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
  const container = document.getElementById("modeBWinners");
  if (!container) return;
  const loserId = selectedModeBLoser;
  const session = getCurrentSession();
  const players = session ? session.players || [] : [];
  container.innerHTML = players
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

function renderModeE() {
  const block = document.getElementById("modeEDiscarderBlock");
  const radioSelf = document.querySelector('input[name="modeEWinType"][value="selfdraw"]');
  const radioDiscard = document.querySelector('input[name="modeEWinType"][value="discard"]');
  if (radioSelf) radioSelf.checked = selectedModeESelfDraw;
  if (radioDiscard) radioDiscard.checked = !selectedModeESelfDraw;
  if (block) block.hidden = selectedModeESelfDraw;
  if (!selectedModeESelfDraw) {
    const session = getCurrentSession();
    const players = session ? session.players || [] : [];
    const nonWinners = players.filter((p) => p.id !== selectedModeEWinner);
    renderPlayerChipsForPlayers("modeEDiscarderChips", selectedModeEDiscarder, "modeEDiscarder", nonWinners);
  }
  if (radioSelf) {
    radioSelf.onchange = () => {
      selectedModeESelfDraw = true;
      selectedModeEDiscarder = null;
      renderModeE();
    };
  }
  if (radioDiscard) {
    radioDiscard.onchange = () => {
      selectedModeESelfDraw = false;
      renderModeE();
    };
  }
}

// ---------- Mode calculations ----------
function parseScore(str) {
  if (str === "" || str === "-") return NaN;
  const n = parseFloat(String(str).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function runModeA() {
  const winnerId = selectedModeAWinner;
  if (!winnerId) {
    showToast(t("selectPlayer"));
    return;
  }
  const loserInputs = document.querySelectorAll(
    '#modeALosers input[data-mode-a-loser]'
  );
  let total = 0;
  const updates = [];
  const parts = [];
  for (const input of loserInputs) {
    const pid = input.getAttribute("data-mode-a-loser");
    const val = parseScore(input.value);
    const amount = Number.isFinite(val) ? val : 0;
    total += amount;
    updates.push({ id: pid, delta: -amount });
    if (amount !== 0) parts.push(`${getPlayerName(pid)} ${amount > 0 ? "-" + amount : amount}`);
  }
  updates.push({ id: winnerId, delta: total });
  const session = getCurrentSession();
  const scaled = getScoreScale(session) === 10 ? updates.map((u) => ({ id: u.id, delta: (Number(u.delta) || 0) * 10 })) : updates;
  const remark = (document.getElementById("modeARemark")?.value || "").trim();
  const msg = getLocale() === "zh-HK"
    ? `${getPlayerName(winnerId)} 贏 ${total}（${parts.join("、") || "—"}）`
    : `${getPlayerName(winnerId)} won ${total} (from ${parts.join(", ") || "—"})`;
  applyUpdates(scaled, msg, remark);
  loserInputs.forEach((i) => (i.value = ""));
  if (document.getElementById("modeARemark")) document.getElementById("modeARemark").value = "";
  showToast(t("scoreUpdated"));
}

function runModeB() {
  const loserId = selectedModeBLoser;
  if (!loserId) {
    showToast(t("selectPlayer"));
    return;
  }
  const winnerInputs = document.querySelectorAll(
    '#modeBWinners input[data-mode-b-winner]'
  );
  let total = 0;
  const updates = [];
  const parts = [];
  for (const input of winnerInputs) {
    const pid = input.getAttribute("data-mode-b-winner");
    const val = parseScore(input.value);
    const amount = Number.isFinite(val) ? val : 0;
    total += amount;
    updates.push({ id: pid, delta: amount });
    if (amount !== 0) parts.push(`${getPlayerName(pid)} +${amount}`);
  }
  updates.push({ id: loserId, delta: -total });
  const sessionB = getCurrentSession();
  const scaledB = getScoreScale(sessionB) === 10 ? updates.map((u) => ({ id: u.id, delta: (Number(u.delta) || 0) * 10 })) : updates;
  const remark = (document.getElementById("modeBRemark")?.value || "").trim();
  const msg = getLocale() === "zh-HK"
    ? `${getPlayerName(loserId)} 付 ${total}（${parts.join("、") || "—"}）`
    : `${getPlayerName(loserId)} paid ${total} (to ${parts.join(", ") || "—"})`;
  applyUpdates(scaledB, msg, remark);
  winnerInputs.forEach((i) => (i.value = ""));
  if (document.getElementById("modeBRemark")) document.getElementById("modeBRemark").value = "";
  showToast(t("scoreUpdated"));
}

function runModeC() {
  const fromId = selectedModeCFrom;
  const toId = selectedModeCTo;
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
  const sessionC = getCurrentSession();
  const scaleC = getScoreScale(sessionC);
  const updatesC = [
    { id: fromId, delta: -amount },
    { id: toId, delta: amount },
  ];
  const scaledC = scaleC === 10 ? updatesC.map((u) => ({ id: u.id, delta: (Number(u.delta) || 0) * 10 })) : updatesC;
  const remark = (document.getElementById("modeCRemark")?.value || "").trim();
  const msg = getLocale() === "zh-HK"
    ? `${getPlayerName(fromId)} → ${getPlayerName(toId)}：${amount}`
    : `${getPlayerName(fromId)} → ${getPlayerName(toId)}: ${amount}`;
  applyUpdates(scaledC, msg, remark);
  if (amountEl) amountEl.value = "";
  if (document.getElementById("modeCRemark")) document.getElementById("modeCRemark").value = "";
  showToast(t("scoreUpdated"));
}

function runModeD() {
  const playerId = selectedModeDPlayer;
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
  const sessionD = getCurrentSession();
  const scaleD = getScoreScale(sessionD);
  const deltaD = scaleD === 10 ? (Number(points) || 0) * 10 : (Number(points) || 0);
  const remark = (document.getElementById("modeDRemark")?.value || "").trim();
  const msg = getLocale() === "zh-HK"
    ? `${getPlayerName(playerId)} ${points >= 0 ? "+" : ""}${points}`
    : `${getPlayerName(playerId)} ${points >= 0 ? "+" : ""}${points}`;
  applyUpdates([{ id: playerId, delta: deltaD }], msg, remark);
  if (pointsEl) pointsEl.value = "";
  if (document.getElementById("modeDRemark")) document.getElementById("modeDRemark").value = "";
  showToast(t("scoreUpdated"));
}

function runModeE() {
  const winnerId = selectedModeEWinner;
  if (!winnerId) {
    showToast(t("selectPlayer"));
    return;
  }
  const faanEl = document.getElementById("modeEFaan");
  const faanInput = parseScore(faanEl?.value ?? "");
  if (!Number.isFinite(faanInput) || faanInput < 0) {
    showToast(t("invalidNumber"));
    return;
  }
  // Use actual radio selection so description always matches what user selected
  const winTypeRadio = document.querySelector('input[name="modeEWinType"]:checked');
  const isSelfDraw = winTypeRadio ? winTypeRadio.value === "selfdraw" : selectedModeESelfDraw;

  if (!isSelfDraw && !selectedModeEDiscarder) {
    showToast(getLocale() === "zh-HK" ? "請選擇出銃者" : "Please select who discarded");
    return;
  }
  const session = getCurrentSession();
  if (!session) return;
  const players = session.players || [];
  const losers = players.filter((p) => p.id !== winnerId);
  const n = losers.length;

  // Mode E uses ×10 internally (one decimal place, no floats in system)
  const faanTenths = Math.round(faanInput * 10);
  if (faanTenths < 0) {
    showToast(t("invalidNumber"));
    return;
  }
  const faanDisplay = faanTenths % 10 === 0 ? String(faanTenths / 10) : (faanTenths / 10).toFixed(1);

  // First time using mode E in this session: switch to tenths (×10)
  if (getScoreScale(session) !== 10) {
    session.scoreScale = 10;
    session.startingScore = Math.round((Number(session.startingScore) ?? 0) * 10);
    players.forEach((p) => {
      p.score = Math.round((Number(p.score) || 0) * 10);
      p.initialScore = Math.round((Number(p.initialScore) ?? 0) * 10);
    });
  }

  const isZh = getLocale() === "zh-HK";
  let updates;
  let msg;
  if (isSelfDraw) {
    // 自摸：每人付 1× 番，贏家收 n× 番
    const totalWin = n * faanTenths;
    updates = [
      { id: winnerId, delta: totalWin },
      ...losers.map((p) => ({ id: p.id, delta: -faanTenths })),
    ];
    const loserNames = losers.map((p) => getPlayerName(p.id)).join(isZh ? "、" : ", ");
    const totalWinDisplay = formatScoreDisplay(totalWin, session);
    const faanDisplayNeg = formatScoreDisplay(-faanTenths, session);
    msg = isZh
      ? `${getPlayerName(winnerId)} 自摸 ${faanDisplay}番 +${totalWinDisplay}（${loserNames} 各 ${faanDisplayNeg}）`
      : `${getPlayerName(winnerId)} self-draw ${faanDisplay} faan +${totalWinDisplay} (${loserNames} each ${faanDisplayNeg})`;
  } else {
    // 出銃：出銃者付 1× 番，其餘兩人各付 0.5× 番（用 tenths 所以 0.5 = round(faanTenths/2)）
    const halfTenths = Math.round(faanTenths / 2);
    const otherLosers = losers.filter((p) => p.id !== selectedModeEDiscarder);
    const totalWin = faanTenths + otherLosers.length * halfTenths;
    updates = [
      { id: winnerId, delta: totalWin },
      { id: selectedModeEDiscarder, delta: -faanTenths },
      ...otherLosers.map((p) => ({ id: p.id, delta: -halfTenths })),
    ];
    const discarderName = getPlayerName(selectedModeEDiscarder);
    const otherNames = otherLosers.map((p) => getPlayerName(p.id)).join(isZh ? "、" : ", ");
    const totalWinDisplay = formatScoreDisplay(totalWin, session);
    const discarderPayDisplay = formatScoreDisplay(-faanTenths, session);
    const halfDisplay = formatScoreDisplay(-halfTenths, session);
    // 出銃：出銃者 1×，其餘 0.5× — describe clearly so not confused with 自摸
    msg = isZh
      ? `${getPlayerName(winnerId)} 食${discarderName} 出銃 ${faanDisplay}番 +${totalWinDisplay}（${discarderName} ${discarderPayDisplay}，${otherNames} 各 ${halfDisplay}）`
      : `${getPlayerName(winnerId)} win by ${discarderName} discard ${faanDisplay} faan +${totalWinDisplay} (${discarderName} ${discarderPayDisplay}; ${otherNames} each ${halfDisplay})`;
  }
  const remark = (document.getElementById("modeERemark")?.value || "").trim();
  applyUpdates(updates, msg, remark, { updates });
  if (faanEl) faanEl.value = "";
  if (document.getElementById("modeERemark")) document.getElementById("modeERemark").value = "";
  showToast(t("scoreUpdated"));
}

function getTimeStamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function addHistory(message, remark, options) {
  const session = getCurrentSession();
  if (!session) return;
  session.history = session.history || [];
  const entry = {
    time: getTimeStamp(),
    message,
    remark: remark || "",
  };
  if (options && Array.isArray(options.updates)) entry.updates = options.updates;
  session.history.unshift(entry);
  saveData(state);
  renderHistory();
}

let historyEditIndex = null;

function openHistoryEditModal(index) {
  const session = getCurrentSession();
  if (!session || !session.history || !session.history[index]) return;
  historyEditIndex = index;
  const entry = session.history[index];
  const remarkEl = document.getElementById("historyEditRemark");
  if (remarkEl) remarkEl.value = entry.remark || "";
  const modal = document.getElementById("historyEditModal");
  if (modal) {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeHistoryEditModal() {
  historyEditIndex = null;
  const modal = document.getElementById("historyEditModal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
}

function saveHistoryEdit() {
  const session = getCurrentSession();
  if (!session || historyEditIndex == null || !session.history || !session.history[historyEditIndex]) {
    closeHistoryEditModal();
    return;
  }
  const remarkEl = document.getElementById("historyEditRemark");
  const remark = remarkEl ? remarkEl.value.trim() : "";
  session.history[historyEditIndex].remark = remark;
  saveData(state);
  renderHistory();
  closeHistoryEditModal();
  showToast(t("scoreUpdated"));
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const session = getCurrentSession();
  const history = session ? session.history || [] : [];
  if (history.length === 0) {
    list.innerHTML = `<div class="history-empty" data-empty="${t("historyEmpty")}"></div>`;
    return;
  }
  list.innerHTML = history
    .map(
      (entry, index) => `
    <div class="history-item" data-history-index="${index}">
      <span class="history-item-time">${escapeHtml(entry.time)}</span>
      <span class="history-item-message">${escapeHtml(entry.message)}</span>
      ${entry.remark ? `<div class="history-item-remark">${escapeHtml(entry.remark)}</div>` : ""}
      <button type="button" class="history-item-edit-btn btn btn-secondary" data-history-index="${index}" aria-label="${escapeHtml(t("edit"))}">${escapeHtml(t("edit"))}</button>
    </div>
  `
    )
    .join("");
  list.querySelectorAll(".history-item-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-history-index"), 10);
      if (Number.isFinite(idx)) openHistoryEditModal(idx);
    });
  });
}

function clearHistory() {
  const session = getCurrentSession();
  if (!session || !confirm(t("clearHistoryConfirm"))) return;
  session.history = [];
  saveData(state);
  renderHistory();
  showToast(getLocale() === "zh-HK" ? "已清空紀錄" : "History cleared");
}

function applyUpdates(updates, message, remark, addHistoryOptions) {
  const session = getCurrentSession();
  if (!session) return;
  const players = session.players || [];
  for (const { id, delta } of updates) {
    const p = players.find((x) => x.id === id);
    if (p) p.score += Number(delta) || 0;
  }
  if (message) addHistory(message, remark || "", addHistoryOptions);
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
  const session = getCurrentSession();
  if (!session) return;
  const players = session.players || [];
  const startingScore = session.startingScore ?? 0;
  const name = prompt(getLocale() === "zh-HK" ? "新玩家名稱：" : "New player name:", "Player " + (players.length + 1));
  if (name == null || !name.trim()) return;
  session.players = session.players || [];
  session.players.push({
    id: `p${Date.now()}_${session.players.length}`,
    name: name.trim(),
    score: startingScore,
    initialScore: startingScore,
  });
  saveData(state);
  renderAll();
  showToast(getLocale() === "zh-HK" ? "已新增玩家" : "Player added");
}

// ---------- Settlement (View C) & Zero-sum check ----------
function runZeroSumCheck() {
  const session = getCurrentSession();
  if (!session || !session.players || session.players.length === 0) return true;
  const sumScore = session.players.reduce((acc, p) => acc + (Number(p.score) || 0), 0);
  const sumInitial = session.players.reduce((acc, p) => acc + (Number(p.initialScore) ?? 0), 0);
  return Math.abs(sumScore - sumInitial) < 1e-6;
}

function showZeroSumErrorModal() {
  const modal = document.getElementById("zeroSumErrorModal");
  const text = document.getElementById("zeroSumErrorText");
  if (text) text.textContent = t("zeroSumError");
  if (modal) {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeZeroSumErrorModal() {
  const modal = document.getElementById("zeroSumErrorModal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
}

function computeDebtResolution(players) {
  const list = (players || []).map((p) => ({
    name: p.name,
    net: (Number(p.score) || 0) - (Number(p.initialScore) ?? 0),
  }));
  const winners = list.filter((x) => x.net > 0).sort((a, b) => b.net - a.net);
  const losers = list.filter((x) => x.net < 0).sort((a, b) => a.net - b.net);
  const steps = [];
  let wi = 0;
  let li = 0;
  while (wi < winners.length && li < losers.length) {
    const w = winners[wi];
    const l = losers[li];
    if (w.net <= 0) { wi++; continue; }
    if (l.net >= 0) { li++; continue; }
    const amount = Math.min(w.net, Math.abs(l.net));
    if (amount <= 0) break;
    steps.push({ fromName: l.name, toName: w.name, amount });
    w.net -= amount;
    l.net += amount;
    if (w.net <= 0) wi++;
    if (l.net >= 0) li++;
  }
  return steps;
}

function openSettlementView() {
  if (!runZeroSumCheck()) {
    showZeroSumErrorModal();
    return;
  }
  const session = getCurrentSession();
  if (!session) return;
  if (mainSection) mainSection.hidden = true;
  const settlementSection = document.getElementById("settlementSection");
  if (settlementSection) settlementSection.hidden = false;
  const nameEl = document.getElementById("settlementSessionName");
  if (nameEl) nameEl.textContent = session.name || "—";
  renderSettlement();
}

function renderSettlement() {
  const session = getCurrentSession();
  if (!session) return;
  const players = session.players || [];
  const history = session.history || [];
  const withNet = players.map((p) => ({
    ...p,
    net: (Number(p.score) || 0) - (Number(p.initialScore) ?? 0),
  }));
  const sorted = withNet.slice().sort((a, b) => b.net - a.net);
  const maxAbs = Math.max(1, ...sorted.map((x) => Math.abs(x.net)));

  const leaderboardEl = document.getElementById("settlementLeaderboard");
  if (leaderboardEl) {
    leaderboardEl.innerHTML = sorted
      .map((row, idx) => {
        const isWinner = row.net > 0;
        const pct = maxAbs > 0 ? (Math.abs(row.net) / maxAbs) * 100 : 0;
        const barClass = row.net >= 0 ? "positive" : "negative";
        const crown = isWinner && idx === 0 ? " 👑" : "";
        const netStr = row.net >= 0 ? `+${formatScoreDisplay(row.net, session)}` : formatScoreDisplay(row.net, session);
        return `
          <div class="settlement-row ${isWinner ? "winner" : ""}">
            <span class="settlement-rank">${idx + 1}</span>
            <span class="settlement-name">${escapeHtml(row.name)}${crown}</span>
            <span class="settlement-net ${barClass}">${netStr}</span>
            <div class="settlement-bar-wrap">
              <div class="settlement-bar ${barClass}" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const totalRecordsEl = document.getElementById("settlementTotalRecords");
  if (totalRecordsEl) totalRecordsEl.textContent = history.length;

  const plan = computeDebtResolution(players);
  const planEl = document.getElementById("settlementPlan");
  if (planEl) {
    const isZh = getLocale() === "zh-HK";
    if (plan.length === 0) {
      planEl.innerHTML = `<p class="settlement-plan-empty">${isZh ? "無需找數，已平帳。" : "No transfers needed."}</p>`;
    } else {
      planEl.innerHTML = plan
        .map(
          (s) =>
            `<div class="settlement-plan-item">${isZh ? `${escapeHtml(s.fromName)} 應付款給 ${escapeHtml(s.toName)}：${formatScoreDisplay(s.amount, session)} 分` : `${escapeHtml(s.fromName)} pays ${escapeHtml(s.toName)}: ${formatScoreDisplay(s.amount, session)}`}</div>`
        )
        .join("");
    }
  }
}

function copyResultsToClipboard() {
  const session = getCurrentSession();
  if (!session) return;
  const players = session.players || [];
  const history = session.history || [];
  const withNet = players.map((p) => ({
    name: p.name,
    net: (Number(p.score) || 0) - (Number(p.initialScore) ?? 0),
  }));
  const sorted = withNet.slice().sort((a, b) => b.net - a.net);
  const plan = computeDebtResolution(players);
  const isZh = getLocale() === "zh-HK";
  const lines = [
    session.name || "Settlement",
    "",
    isZh ? "【排行榜】" : "【Leaderboard】",
    ...sorted.map((row, i) => {
      const netStr = row.net >= 0 ? `+${formatScoreDisplay(row.net, session)}` : formatScoreDisplay(row.net, session);
      const crown = row.net > 0 && i === 0 ? " 👑" : "";
      return `${i + 1}. ${row.name}${crown}: ${netStr}`;
    }),
    "",
    isZh ? "【找數建議】" : "【Settlement Plan】",
    ...(plan.length === 0
      ? [isZh ? "無需找數。" : "No transfers needed."]
      : plan.map((s) => (isZh ? `${s.fromName} 應付款給 ${s.toName}：${formatScoreDisplay(s.amount, session)} 分` : `${s.fromName} pays ${s.toName}: ${formatScoreDisplay(s.amount, session)}`))),
    "",
    isZh ? `本局總紀錄次數：${history.length}` : `Total records: ${history.length}`,
  ];
  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(
    () => showToast(isZh ? "已複製賽果" : "Results copied"),
    () => showToast("Copy failed")
  );
}

function backFromSettlement() {
  const settlementSection = document.getElementById("settlementSection");
  if (settlementSection) settlementSection.hidden = true;
  if (mainSection) mainSection.hidden = false;
}

function confirmSettlementAndBackToDashboard() {
  const session = getCurrentSession();
  if (!session) return;
  session.isSettled = true;
  saveData(state);
  state.currentSessionId = null;
  showDashboard();
  showToast(getLocale() === "zh-HK" ? "已結算，已返回大廳" : "Settlement confirmed. Back to dashboard.");
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
        const isE = id === "panelE" && mode === "e";
        const active = isA || isB || isC || isD || isE;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
      if (mode === "a") renderModeA();
      if (mode === "b") renderModeB();
      if (mode === "e") renderModeE();
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

// ---------- Buttons ----------
function bindButtons() {
  if (startScoreboardBtn) {
    startScoreboardBtn.addEventListener("click", startScoreboard);
  }
  if (addPlayerBtn) {
    addPlayerBtn.addEventListener("click", addPlayer);
  }
  document.getElementById("backToDashboardBtn")?.addEventListener("click", backToDashboard);
  document.getElementById("newGameBtn")?.addEventListener("click", newGame);
  document.getElementById("resetSessionBtn")?.addEventListener("click", resetSession);
  document.getElementById("deleteSessionBtn")?.addEventListener("click", deleteSession);
  document.getElementById("settlementBtn")?.addEventListener("click", openSettlementView);
  document.getElementById("closeZeroSumModalBtn")?.addEventListener("click", closeZeroSumErrorModal);
  document.getElementById("copyResultsBtn")?.addEventListener("click", copyResultsToClipboard);
  document.getElementById("backFromSettlementBtn")?.addEventListener("click", backFromSettlement);
  document.getElementById("confirmSettlementBtn")?.addEventListener("click", confirmSettlementAndBackToDashboard);
  document.getElementById("deleteFromSettlementBtn")?.addEventListener("click", deleteSession);
  document.getElementById("zeroSumErrorModal")?.addEventListener("click", (e) => {
    if (e.target.id === "zeroSumErrorModal") closeZeroSumErrorModal();
  });
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
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
  document.getElementById("modeECalcBtn")?.addEventListener("click", runModeE);
  document.getElementById("historyEditSaveBtn")?.addEventListener("click", saveHistoryEdit);
  document.getElementById("historyEditCancelBtn")?.addEventListener("click", closeHistoryEditModal);
  document.getElementById("historyEditModal")?.addEventListener("click", (e) => {
    if (e.target.id === "historyEditModal") closeHistoryEditModal();
  });
}

// ---------- Init ----------
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function init() {
  const data = loadData();
  if (data && data.sessions && data.sessions.length > 0) {
    state.sessions = data.sessions;
    state.currentSessionId = data.currentSessionId || null;
    if (state.currentSessionId && state.sessions.some((s) => s.id === state.currentSessionId)) {
      showMain();
      renderAll();
    } else {
      showDashboard();
    }
  } else {
    state = { sessions: [], currentSessionId: null };
    showInit();
    renderPlayerNameInputs(4);
  }
  bindTabs();
  bindButtons();
  bindNumpad();
}

init();
