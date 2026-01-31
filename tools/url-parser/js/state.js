/**
 * Global state for URL Parser
 */

export const state = {
  currentUrlObj: null,
  isBulkMode: false,
  MAX_HISTORY: 10,
  historyData: JSON.parse(localStorage.getItem("url_parser_history") || "[]")
};

export function updateState(updates) {
  Object.assign(state, updates);
}

export function saveHistoryToStorage() {
  localStorage.setItem("url_parser_history", JSON.stringify(state.historyData));
}
