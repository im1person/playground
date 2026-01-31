/**
 * YouTube specific features
 */
import { state } from './state.js';
import { showToast } from './utils.js';
import { updateUrlDisplays } from './url-core.js';

export function isYouTubeUrl(url) {
  if (!url) return false;
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "www.youtube.com" ||
    hostname === "youtube.com" ||
    hostname === "youtu.be" ||
    hostname === "m.youtube.com"
  );
}

export function handleYouTubeUrl() {
  const timestampCard = document.getElementById("youtubeTimestampCard");
  
  if (isYouTubeUrl(state.currentUrlObj)) {
    timestampCard.style.display = "block";
    const tParam = state.currentUrlObj.searchParams.get("t");
    if (tParam) {
      parseTimestampToInputs(tParam);
    } else {
      document.getElementById("ytHours").value = "";
      document.getElementById("ytMinutes").value = "";
      document.getElementById("ytSeconds").value = "";
    }
    clearTimestampErrors();
    updateCleanButtonVisibility();
  } else {
    timestampCard.style.display = "none";
  }
}

export function updateCleanButtonVisibility() {
  if (!state.currentUrlObj || !isYouTubeUrl(state.currentUrlObj)) return;
  const trackingParams = ["si", "feature", "pp", "ab_channel", "attr_tag", "index", "list"];
  const hasTracking = trackingParams.some(param => state.currentUrlObj.searchParams.has(param));
  document.getElementById("cleanYoutubeBtn").style.display = hasTracking ? "inline-flex" : "none";
}

export function parseTimestampToInputs(timestamp) {
  let totalSeconds = 0;
  if (/^\d+$/.test(timestamp)) {
    totalSeconds = parseInt(timestamp);
  } else {
    const hourMatch = timestamp.match(/(\d+)h/);
    const minMatch = timestamp.match(/(\d+)m/);
    const secMatch = timestamp.match(/(\d+)s/);
    totalSeconds = (hourMatch ? parseInt(hourMatch[1]) : 0) * 3600 +
                   (minMatch ? parseInt(minMatch[1]) : 0) * 60 +
                   (secMatch ? parseInt(secMatch[1]) : 0);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  document.getElementById("ytHours").value = hours > 0 ? hours.toString().padStart(2, "0") : "";
  document.getElementById("ytMinutes").value = minutes > 0 ? minutes.toString().padStart(2, "0") : "";
  document.getElementById("ytSeconds").value = seconds > 0 ? seconds.toString().padStart(2, "0") : "";
}

export function applyYouTubeTimestamp() {
  if (!state.currentUrlObj || !isYouTubeUrl(state.currentUrlObj)) return;
  
  const hours = parseInt(document.getElementById("ytHours").value) || 0;
  const minutes = parseInt(document.getElementById("ytMinutes").value) || 0;
  const seconds = parseInt(document.getElementById("ytSeconds").value) || 0;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds > 0) {
    let timestamp = "";
    if (hours > 0) timestamp += `${hours}h`;
    if (minutes > 0) timestamp += `${minutes}m`;
    if (seconds > 0) timestamp += `${seconds}s`;
    state.currentUrlObj.searchParams.set("t", timestamp || "0s");
  } else {
    state.currentUrlObj.searchParams.delete("t");
  }

  clearTimestampErrors();
  updateUrlDisplays();
  window.dispatchEvent(new CustomEvent('params-updated'));
}

export function cleanYouTubeUrl() {
  if (!state.currentUrlObj || !isYouTubeUrl(state.currentUrlObj)) return;
  const trackingParams = ["si", "feature", "pp", "ab_channel", "attr_tag", "index", "list"];
  let removedAny = false;

  trackingParams.forEach(param => {
    if (state.currentUrlObj.searchParams.has(param)) {
      state.currentUrlObj.searchParams.delete(param);
      removedAny = true;
    }
  });

  if (removedAny) {
    updateUrlDisplays();
    window.dispatchEvent(new CustomEvent('params-updated'));
    updateCleanButtonVisibility();
    
    const btn = document.getElementById("cleanYoutubeBtn");
    const originalText = btn.textContent;
    const currentLocale = localStorage.getItem("playground-locale") || "en";
    btn.textContent = currentLocale === "zh-Hant" ? "已清理!" : "Cleaned!";
    setTimeout(() => (btn.textContent = originalText), 2000);
  }
}

export function clearTimestampErrors() {
  document.querySelectorAll(".timestamp-group").forEach(g => g.classList.remove("error"));
  document.querySelectorAll(".timestamp-input").forEach(i => i.classList.remove("error"));
}

export function validateTimestampInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return true;
  const value = input.value;
  const group = input.closest(".timestamp-group");
  if (!group) return true;
  
  if (value === "") {
    group.classList.remove("error");
    input.classList.remove("error");
    return true;
  }
  
  const numValue = parseInt(value);
  let isValid = !(isNaN(numValue) || numValue < 0);
  
  if (inputId === "ytHours") {
    if (numValue > 99) { isValid = false; input.value = 99; }
  } else if (inputId === "ytMinutes" || inputId === "ytSeconds") {
    if (numValue > 59) { isValid = false; input.value = 59; }
  }
  
  if (!isValid) {
    group.classList.add("error");
    input.classList.add("error");
  } else {
    group.classList.remove("error");
    input.classList.remove("error");
  }
  return isValid;
}

export function clearYouTubeTimestamp() {
  document.getElementById("ytHours").value = "";
  document.getElementById("ytMinutes").value = "";
  document.getElementById("ytSeconds").value = "";
  clearTimestampErrors();
  if (state.currentUrlObj && isYouTubeUrl(state.currentUrlObj)) {
    state.currentUrlObj.searchParams.delete("t");
  }
}
