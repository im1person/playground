/**
 * History management module
 */
import { state, saveHistoryToStorage } from './state.js';
import { showToast } from './utils.js';
import { parseUrl } from './url-core.js';

export function saveToHistory(url) {
  if (!url) return;
  try {
    new URL(url.startsWith('//') ? 'https:' + url : (url.match(/^https?:\/\//) ? url : 'https://' + url));
  } catch (e) { return; }

  if (state.historyData.length > 0 && state.historyData[0].url === url) return;

  const item = { url: url, timestamp: Date.now() };
  state.historyData = [item, ...state.historyData.filter(i => i.url !== url)].slice(0, state.MAX_HISTORY);
  saveHistoryToStorage();
  renderHistory();
}

export function renderHistory() {
  const container = document.getElementById("historyCard");
  const list = document.getElementById("historyList");
  if (!container || !list) return;

  if (state.historyData.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  list.innerHTML = "";

  state.historyData.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "history-item";
    
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let domain = "";
    try {
        domain = new URL(item.url.startsWith('//') ? 'https:' + item.url : (item.url.match(/^https?:\/\//) ? item.url : 'https://' + item.url)).hostname;
    } catch(e) { domain = "link"; }

    const contentDiv = document.createElement("div");
    contentDiv.className = "history-item-content";

    const urlDiv = document.createElement("div");
    urlDiv.className = "history-url";
    urlDiv.textContent = item.url;

    const metaDiv = document.createElement("div");
    metaDiv.className = "history-meta";

    const timeSpan = document.createElement("span");
    timeSpan.textContent = timeStr;

    const dotSpan = document.createElement("span");
    dotSpan.textContent = "•";

    const domainSpan = document.createElement("span");
    domainSpan.textContent = domain;

    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(dotSpan);
    metaDiv.appendChild(domainSpan);

    contentDiv.appendChild(urlDiv);
    contentDiv.appendChild(metaDiv);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete-history";
    deleteBtn.title = "Delete";
    deleteBtn.textContent = "✕";

    div.appendChild(contentDiv);
    div.appendChild(deleteBtn);

    div.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-history")) {
        deleteHistoryItem(index);
        return;
      }
      document.getElementById("urlInput").value = item.url;
      parseUrl(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    list.appendChild(div);
  });
}

export function deleteHistoryItem(index) {
  state.historyData.splice(index, 1);
  saveHistoryToStorage();
  renderHistory();
}

export function clearHistory() {
  const currentLocale = localStorage.getItem("playground-locale") || "en";
  const msg = currentLocale === "zh-Hant" ? "確定要清除所有歷史紀錄嗎？" : "Are you sure you want to clear all history?";
  if (!confirm(msg)) return;

  state.historyData = [];
  saveHistoryToStorage();
  renderHistory();
  showToast(currentLocale === "zh-Hant" ? "歷史紀錄已清除" : "History cleared", "info");
}
