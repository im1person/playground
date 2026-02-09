/**
 * Utility functions for URL Parser
 */

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
  
  const msg = document.createElement("span");
  msg.className = "toast-message";
  msg.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(msg);
  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
