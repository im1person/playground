// Secret Santa Generator Logic

let participants = [];
let exclusions = new Set(); // Store as "name1|name2" strings (sorted)

const participantInput = document.getElementById("participantInput");
const addBtn = document.getElementById("addBtn");
const participantsList = document.getElementById("participantsList");
const exclusionsList = document.getElementById("exclusionsList");
const generateBtn = document.getElementById("generateBtn");
const resultsSection = document.getElementById("resultsSection");
const resultsList = document.getElementById("resultsList");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Get localized text
function t(key) {
  const locale = getLocale();
  const translations = {
    en: {
      enterName: "Enter name",
      remove: "Remove",
      noExclusions: "No exclusions set",
      addExclusion: "Add Exclusion",
      removeExclusion: "Remove",
      generate: "Generate Secret Santa",
      results: "Results",
      copyResults: "Copy Results",
      reset: "Reset",
      noParticipants: "Please add at least 2 participants",
      impossible: "Assignment impossible with current exclusions. Please remove some exclusions.",
      success: "Secret Santa assignments generated!",
      giver: "Giver",
      receiver: "Receiver",
      copied: "Results copied to clipboard!",
    },
    "zh-Hant": {
      enterName: "輸入姓名",
      remove: "移除",
      noExclusions: "未設定排除規則",
      addExclusion: "新增排除",
      removeExclusion: "移除",
      generate: "生成秘密聖誕老人",
      results: "結果",
      copyResults: "複製結果",
      reset: "重置",
      noParticipants: "請至少新增 2 位參與者",
      impossible: "無法在目前的排除規則下完成配對。請移除部分排除規則。",
      success: "秘密聖誕老人配對完成！",
      giver: "送禮者",
      receiver: "收禮者",
      copied: "結果已複製到剪貼簿！",
    },
  };
  return translations[locale]?.[key] || key;
}

// Update UI text based on locale
function updateUIText() {
  const locale = getLocale();
  participantInput.placeholder = locale === "zh-Hant" ? "輸入姓名" : "Enter name";
  addBtn.textContent = locale === "zh-Hant" ? "新增" : "Add";
  generateBtn.textContent = locale === "zh-Hant" ? "生成秘密聖誕老人" : "Generate Secret Santa";
  copyBtn.textContent = locale === "zh-Hant" ? "複製結果" : "Copy Results";
  resetBtn.textContent = locale === "zh-Hant" ? "重置" : "Reset";
  renderParticipants();
  renderExclusions();
  renderResults();
}

// Add participant
function addParticipant() {
  const name = participantInput.value.trim();
  if (!name) return;
  if (participants.includes(name)) {
    const locale = getLocale();
    alert(locale === "zh-Hant" ? "此姓名已存在" : "Name already exists");
    return;
  }
  participants.push(name);
  participantInput.value = "";
  renderParticipants();
  renderExclusions();
}

// Remove participant
function removeParticipant(name) {
  participants = participants.filter((p) => p !== name);
  // Remove exclusions involving this participant
  const toRemove = [];
  exclusions.forEach((exclusion) => {
    const [p1, p2] = exclusion.split("|");
    if (p1 === name || p2 === name) {
      toRemove.push(exclusion);
    }
  });
  toRemove.forEach((ex) => exclusions.delete(ex));
  renderParticipants();
  renderExclusions();
}

// Render participants list
function renderParticipants() {
  participantsList.innerHTML = "";
  if (participants.length === 0) {
    participantsList.innerHTML = `<p class="empty-text" data-en="No participants yet" data-zh-Hant="尚無參與者">No participants yet</p>`;
    return;
  }
  participants.forEach((name) => {
    const item = document.createElement("div");
    item.className = "participant-item";
    item.innerHTML = `
      <span class="participant-name">${escapeHtml(name)}</span>
      <button class="remove-btn" onclick="removeParticipant('${escapeHtml(name)}')" aria-label="${t("remove")}">
        ×
      </button>
    `;
    participantsList.appendChild(item);
  });
}

// Render exclusions list
function renderExclusions() {
  exclusionsList.innerHTML = "";
  
  if (participants.length < 2) {
    exclusionsList.innerHTML = `<p class="empty-text" data-en="Add at least 2 participants to set exclusions" data-zh-Hant="至少需要 2 位參與者才能設定排除規則">Add at least 2 participants to set exclusions</p>`;
    return;
  }

  // Create exclusion selector
  const selector = document.createElement("div");
  selector.className = "exclusion-selector";
  
  const select1 = document.createElement("select");
  const select2 = document.createElement("select");
  
  participants.forEach((name) => {
    const option1 = document.createElement("option");
    option1.value = name;
    option1.textContent = name;
    select1.appendChild(option1);
    
    const option2 = document.createElement("option");
    option2.value = name;
    option2.textContent = name;
    select2.appendChild(option2);
  });
  
  const addExclusionBtn = document.createElement("button");
  addExclusionBtn.className = "add-exclusion-btn";
  addExclusionBtn.textContent = t("addExclusion");
  addExclusionBtn.onclick = () => {
    const p1 = select1.value;
    const p2 = select2.value;
    if (p1 === p2) {
      const locale = getLocale();
      alert(locale === "zh-Hant" ? "不能選擇相同的人" : "Cannot select the same person");
      return;
    }
    const exclusion = [p1, p2].sort().join("|");
    exclusions.add(exclusion);
    renderExclusions();
  };
  
  selector.appendChild(select1);
  selector.appendChild(document.createTextNode(" ↔ "));
  selector.appendChild(select2);
  selector.appendChild(addExclusionBtn);
  exclusionsList.appendChild(selector);
  
  // List existing exclusions
  if (exclusions.size === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "empty-text";
    emptyMsg.setAttribute("data-en", "No exclusions set");
    emptyMsg.setAttribute("data-zh-Hant", "未設定排除規則");
    emptyMsg.textContent = t("noExclusions");
    exclusionsList.appendChild(emptyMsg);
  } else {
    exclusions.forEach((exclusion) => {
      const [p1, p2] = exclusion.split("|");
      const item = document.createElement("div");
      item.className = "exclusion-item";
      item.innerHTML = `
        <span>${escapeHtml(p1)} ↔ ${escapeHtml(p2)}</span>
        <button class="remove-btn" onclick="removeExclusion('${escapeHtml(exclusion)}')" aria-label="${t("removeExclusion")}">
          ×
        </button>
      `;
      exclusionsList.appendChild(item);
    });
  }
}

// Remove exclusion
function removeExclusion(exclusion) {
  exclusions.delete(exclusion);
  renderExclusions();
}

// Generate Secret Santa assignments
function generateAssignments() {
  if (participants.length < 2) {
    alert(t("noParticipants"));
    return;
  }

  // Try to generate valid assignment (max 1000 attempts)
  let assignment = null;
  for (let attempt = 0; attempt < 1000; attempt++) {
    assignment = tryGenerateAssignment();
    if (assignment) break;
  }

  if (!assignment) {
    alert(t("impossible"));
    return;
  }

  // Display results
  renderResults(assignment);
  resultsSection.classList.remove("hidden");
}

// Try to generate a valid assignment
function tryGenerateAssignment() {
  const receivers = [...participants];
  const assignment = {};
  const used = new Set();

  for (const giver of participants) {
    // Find valid receivers (not self, not excluded, not already used)
    const validReceivers = receivers.filter(
      (receiver) =>
        receiver !== giver &&
        !isExcluded(giver, receiver) &&
        !used.has(receiver)
    );

    // If no valid receivers, assignment failed
    if (validReceivers.length === 0) {
      return null;
    }

    // Randomly select a receiver
    const receiver =
      validReceivers[Math.floor(Math.random() * validReceivers.length)];
    assignment[giver] = receiver;
    used.add(receiver);
  }

  return assignment;
}

// Check if two participants are excluded
function isExcluded(p1, p2) {
  const exclusion = [p1, p2].sort().join("|");
  return exclusions.has(exclusion);
}

// Render results
function renderResults(assignment) {
  if (!assignment) {
    resultsList.innerHTML = "";
    return;
  }

  resultsList.innerHTML = "";
  const locale = getLocale();
  
  Object.entries(assignment)
    .sort()
    .forEach(([giver, receiver]) => {
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `
        <div class="result-giver">
          <span class="result-label">${locale === "zh-Hant" ? "送禮者" : "Giver"}:</span>
          <span class="result-name">${escapeHtml(giver)}</span>
        </div>
        <div class="result-arrow">→</div>
        <div class="result-receiver">
          <span class="result-label">${locale === "zh-Hant" ? "收禮者" : "Receiver"}:</span>
          <span class="result-name">${escapeHtml(receiver)}</span>
        </div>
      `;
      resultsList.appendChild(item);
    });
}

// Copy results to clipboard
function copyResults() {
  const assignment = {};
  const items = resultsList.querySelectorAll(".result-item");
  items.forEach((item) => {
    const giver = item.querySelector(".result-giver .result-name").textContent;
    const receiver = item.querySelector(".result-receiver .result-name").textContent;
    assignment[giver] = receiver;
  });

  const locale = getLocale();
  const lines = Object.entries(assignment)
    .sort()
    .map(([giver, receiver]) => {
      const giverLabel = locale === "zh-Hant" ? "送禮者" : "Giver";
      const receiverLabel = locale === "zh-Hant" ? "收禮者" : "Receiver";
      return `${giverLabel}: ${giver} → ${receiverLabel}: ${receiver}`;
    });

  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    const btn = copyBtn;
    const originalText = btn.textContent;
    btn.textContent = t("copied");
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Reset everything
function reset() {
  participants = [];
  exclusions.clear();
  participantInput.value = "";
  resultsSection.classList.add("hidden");
  renderParticipants();
  renderExclusions();
  renderResults();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
addBtn.addEventListener("click", addParticipant);
participantInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addParticipant();
});
generateBtn.addEventListener("click", generateAssignments);
copyBtn.addEventListener("click", copyResults);
resetBtn.addEventListener("click", reset);

// Make functions globally available for onclick handlers
window.removeParticipant = removeParticipant;
window.removeExclusion = removeExclusion;

// Initialize
renderParticipants();
renderExclusions();

// Listen for locale changes
document.addEventListener("localeChange", updateUIText);
// Also update on page load after locale menu initializes
setTimeout(updateUIText, 100);

