/**
 * Main Entry Point for URL Parser
 */
import { state, updateState } from './js/state.js';
import { debounce, showToast, escapeHtml } from './js/utils.js';
import { 
  parseUrl, 
  updateUrlDisplays, 
  updateGeneratedUrl, 
  updateUrlFromBulk,
  renderParamsTable,
  renderBulkTextarea,
  addParamRow
} from './js/url-core.js';
import { 
  handleYouTubeUrl, 
  applyYouTubeTimestamp, 
  cleanYouTubeUrl, 
  validateTimestampInput,
  clearYouTubeTimestamp
} from './js/youtube.js';
import { 
  renderHistory, 
  saveToHistory, 
  clearHistory 
} from './js/history.js';

// --- Global UI Listeners ---

document.getElementById("parseBtn").addEventListener("click", () => parseUrl(false));
document.getElementById("urlInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") parseUrl(false);
});

// Smart Auto-Parse with debounce
const debouncedParse = debounce(() => parseUrl(true), 300);
document.getElementById("urlInput").addEventListener("input", () => {
  updateClearButtonVisibility();
  debouncedParse();
});

function updateClearButtonVisibility() {
  const input = document.getElementById("urlInput");
  const clearBtn = document.getElementById("clearInputBtn");
  clearBtn.style.display = input.value ? "block" : "none";
}

document.getElementById("clearInputBtn").addEventListener("click", () => {
  const input = document.getElementById("urlInput");
  input.value = "";
  updateClearButtonVisibility();
  
  // Reset UI
  updateState({ currentUrlObj: null });
  ['protocol', 'host', 'port', 'hash'].forEach(id => document.getElementById(id).textContent = "-");
  document.getElementById("generatedUrl").value = "";
  document.getElementById("queryParams").innerHTML = "";
  document.getElementById("bulkEditTextarea").value = "";
  document.getElementById("pathnameContainer").innerHTML = '<span class="sub-text" style="font-style: italic; opacity: 0.6">Click to edit segments...</span>';
  handleYouTubeUrl();
  input.focus();
});

document.getElementById("urlInput").addEventListener("click", async () => {
  if (document.getElementById("urlInput").value === "") {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        document.getElementById("urlInput").value = text;
        updateClearButtonVisibility();
        parseUrl(true);
      }
    } catch (err) {}
  }
});

document.getElementById("pasteBtn").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById("urlInput").value = text;
    updateClearButtonVisibility();
    parseUrl(false);
    document.getElementById("urlInput").focus();
  } catch (err) {
    document.getElementById("urlInput").focus();
  }
});

document.getElementById("addParamBtn").addEventListener("click", () => {
  addParamRow("", "");
  updateGeneratedUrl();
});

document.getElementById("copyBtn").addEventListener("click", () => {
  const copyText = document.getElementById("generatedUrl");
  copyText.select();
  navigator.clipboard.writeText(copyText.value).then(() => {
    const btn = document.getElementById("copyBtn");
    const originalText = btn.textContent;
    const currentLocale = localStorage.getItem("playground-locale") || "en";
    btn.textContent = currentLocale === "zh-Hant" ? "已複製!" : "Copied!";
    setTimeout(() => (btn.textContent = originalText), 2000);
  });
});

document.getElementById("bulkEditToggle").addEventListener("click", toggleBulkEdit);
document.getElementById("bulkEditTextarea").addEventListener("input", updateUrlFromBulk);

// YouTube
document.getElementById("clearTimestampBtn").addEventListener("click", () => {
  clearYouTubeTimestamp();
  updateUrlDisplays();
  renderParamsTable();
  renderBulkTextarea();
});
document.getElementById("cleanYoutubeBtn").addEventListener("click", cleanYouTubeUrl);
document.getElementById("ytCopyBtn").addEventListener("click", () => {
  const url = document.getElementById("generatedUrl").value;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById("ytCopyBtn");
    const originalText = btn.textContent;
    const currentLocale = localStorage.getItem("playground-locale") || "en";
    btn.textContent = currentLocale === "zh-Hant" ? "已複製!" : "Copied!";
    setTimeout(() => (btn.textContent = originalText), 2000);
  });
});
document.getElementById("ytOpenBtn").addEventListener("click", () => {
  const url = document.getElementById("generatedUrl").value;
  if (url) window.open(url, "_blank");
});

document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);

// Listeners for internal events
window.addEventListener('url-parsed', (e) => {
  handleYouTubeUrl();
  updateClearButtonVisibility();
  if (!e.detail.silent) saveToHistory(e.detail.urlString);
  if (window.updateLocale) window.updateLocale(localStorage.getItem("playground-locale") || "en");
});

window.addEventListener('params-updated', () => {
  renderParamsTable();
  renderBulkTextarea();
});

// Helper for UI logic that bridges modules
function toggleBulkEdit() {
  state.isBulkMode = !state.isBulkMode;
  const tableContainer = document.getElementById("queryParams");
  const addBtn = document.getElementById("addParamBtn");
  const bulkContainer = document.getElementById("bulkEditContainer");
  const toggleBtn = document.getElementById("bulkEditToggle");

  if (state.isBulkMode) {
    renderBulkTextarea();
    tableContainer.style.display = "none";
    addBtn.style.display = "none";
    bulkContainer.style.display = "block";
    toggleBtn.setAttribute("data-en", "Key-Value Edit");
    toggleBtn.setAttribute("data-zh-Hant", "表格編輯");
  } else {
    renderParamsTable();
    tableContainer.style.display = "block";
    addBtn.style.display = "inline-flex";
    bulkContainer.style.display = "none";
    toggleBtn.setAttribute("data-en", "Bulk Edit");
    toggleBtn.setAttribute("data-zh-Hant", "批量編輯");
  }
  if (window.updateLocale) window.updateLocale(localStorage.getItem("playground-locale") || "en");
}

// Global initialization
renderHistory();
updateClearButtonVisibility();

// Re-expose needed functions for inline event listeners if any (though best practice is to avoid them)
// For this tool, we've moved most to addEventListener. 

// YouTube field listeners
["ytHours", "ytMinutes", "ytSeconds"].forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") applyYouTubeTimestamp(); });
  input.addEventListener("input", (e) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val !== e.target.value) e.target.value = val;
    validateTimestampInput(id);
    applyYouTubeTimestamp();
  });
  input.addEventListener("blur", (e) => {
    let val = e.target.value.trim();
    if (val !== "" && val.length === 1) e.target.value = val.padStart(2, "0");
  });
});

// Since some functions like addParamRow are needed in url-core but also in event listeners here,
// we ensure they are exported correctly. 
