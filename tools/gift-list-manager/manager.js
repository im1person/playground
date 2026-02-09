// Gift List Manager

let gifts = [];

const recipientInput = document.getElementById("recipientInput");
const giftInput = document.getElementById("giftInput");
const budgetInput = document.getElementById("budgetInput");
const addBtn = document.getElementById("addBtn");
const giftList = document.getElementById("giftList");
const totalBudgetEl = document.getElementById("totalBudget");
const purchasedCountEl = document.getElementById("purchasedCount");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Load gifts from localStorage
function loadGifts() {
  const saved = localStorage.getItem("gift-list");
  if (saved) {
    gifts = JSON.parse(saved);
  }
  renderGifts();
  updateStats();
}

// Save gifts to localStorage
function saveGifts() {
  localStorage.setItem("gift-list", JSON.stringify(gifts));
}

// Add gift
function addGift() {
  const recipient = recipientInput.value.trim();
  const gift = giftInput.value.trim();
  const budget = parseFloat(budgetInput.value) || 0;

  if (!recipient || !gift) {
    const locale = getLocale();
    alert((locale === "zh-HK" || locale === "zh-Hant") ? "請填寫收禮者和禮物" : "Please fill in recipient and gift");
    return;
  }

  gifts.push({
    id: Date.now(),
    recipient,
    gift,
    budget,
    purchased: false,
  });

  recipientInput.value = "";
  giftInput.value = "";
  budgetInput.value = "";

  saveGifts();
  renderGifts();
  updateStats();
}

// Toggle purchased status
function togglePurchased(id) {
  const gift = gifts.find((g) => g.id === id);
  if (gift) {
    gift.purchased = !gift.purchased;
    saveGifts();
    renderGifts();
    updateStats();
  }
}

// Delete gift
function deleteGift(id) {
  gifts = gifts.filter((g) => g.id !== id);
  saveGifts();
  renderGifts();
  updateStats();
}

// Render gifts
function renderGifts() {
  giftList.innerHTML = "";

  if (gifts.length === 0) {
    const locale = getLocale();
    giftList.innerHTML = `<p class="empty-text" data-en="No gifts yet. Add your first gift above!" data-zh-HK="尚無禮物。請在上方新增第一份禮物！">No gifts yet. Add your first gift above!</p>`;
    return;
  }

  // Sort: purchased at bottom
  const sortedGifts = [...gifts].sort((a, b) => {
    if (a.purchased && !b.purchased) return 1;
    if (!a.purchased && b.purchased) return -1;
    return 0;
  });

  sortedGifts.forEach((gift) => {
    const item = document.createElement("div");
    item.className = `gift-item ${gift.purchased ? "purchased" : ""}`;
    item.innerHTML = `
      <div class="gift-main">
        <div class="gift-info">
          <div class="gift-recipient">${escapeHtml(gift.recipient)}</div>
          <div class="gift-name">${escapeHtml(gift.gift)}</div>
        </div>
        <div class="gift-budget">$${gift.budget.toFixed(2)}</div>
      </div>
      <div class="gift-actions">
        <button class="action-btn toggle-btn ${gift.purchased ? "purchased" : ""}" onclick="togglePurchased(${gift.id})">
          ${gift.purchased ? "✓" : "○"}
        </button>
        <button class="action-btn delete-btn" onclick="deleteGift(${gift.id})">×</button>
      </div>
    `;
    giftList.appendChild(item);
  });
}

// Update statistics
function updateStats() {
  const total = gifts.reduce((sum, gift) => sum + gift.budget, 0);
  const purchased = gifts.filter((g) => g.purchased).length;

  totalBudgetEl.textContent = `$${total.toFixed(2)}`;
  purchasedCountEl.textContent = `${purchased} / ${gifts.length}`;
}

// Export list
function exportList() {
  const locale = getLocale();
  const lines = gifts.map((gift) => {
    const status = gift.purchased
      ? (locale === "zh-HK" || locale === "zh-Hant")
        ? "[已購買]"
        : "[Purchased]"
      : (locale === "zh-HK" || locale === "zh-Hant")
      ? "[待購買]"
      : "[Pending]";
    return `${status} ${gift.recipient}: ${gift.gift} - $${gift.budget.toFixed(2)}`;
  });

  const total = gifts.reduce((sum, gift) => sum + gift.budget, 0);
  lines.push("");
  lines.push(
    (locale === "zh-HK" || locale === "zh-Hant")
      ? `總預算: $${total.toFixed(2)}`
      : `Total Budget: $${total.toFixed(2)}`
  );

  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    const btn = exportBtn;
    const originalText = btn.textContent;
    btn.textContent = (locale === "zh-HK" || locale === "zh-Hant") ? "已複製！" : "Copied!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Clear all
function clearAll() {
  const locale = getLocale();
  if (
    confirm(
      (locale === "zh-HK" || locale === "zh-Hant")
        ? "確定要清除所有禮物嗎？"
        : "Are you sure you want to clear all gifts?"
    )
  ) {
    gifts = [];
    saveGifts();
    renderGifts();
    updateStats();
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.togglePurchased = togglePurchased;
window.deleteGift = deleteGift;

// Event listeners
addBtn.addEventListener("click", addGift);
recipientInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") giftInput.focus();
});
giftInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") budgetInput.focus();
});
budgetInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addGift();
});
exportBtn.addEventListener("click", exportList);
clearBtn.addEventListener("click", clearAll);

// Update UI text based on locale
function updateUIText() {
  const locale = getLocale();
  recipientInput.placeholder =
    (locale === "zh-HK" || locale === "zh-Hant") ? "收禮者姓名" : "Recipient name";
  giftInput.placeholder = (locale === "zh-HK" || locale === "zh-Hant") ? "禮物想法" : "Gift idea";
  budgetInput.placeholder = (locale === "zh-HK" || locale === "zh-Hant") ? "預算" : "Budget";
}

// Initialize
loadGifts();
updateUIText();

// Listen for locale changes
document.addEventListener("localeChange", () => {
  updateUIText();
  renderGifts();
  updateStats();
});

