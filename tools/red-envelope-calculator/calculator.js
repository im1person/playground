// Red Envelope Calculator
const LUCKY_AMOUNTS = [88, 168, 200, 600, 800, 1200, 1600, 2000, 3600, 6000, 6600, 10000];

const totalBudgetEl = document.getElementById("totalBudget");
const currencyEl = document.getElementById("currency");
const recipientCountEl = document.getElementById("recipientCount");
const calcBtn = document.getElementById("calcBtn");
const resultSection = document.getElementById("resultSection");
const perPersonEl = document.getElementById("perPerson");
const currencyLabelEl = document.getElementById("currencyLabel");
const resultNoteEl = document.getElementById("resultNote");
const copyBtn = document.getElementById("copyBtn");
const luckyListEl = document.getElementById("luckyList");
const recipientNameEl = document.getElementById("recipientName");
const addRecipientBtn = document.getElementById("addRecipientBtn");
const recipientListEl = document.getElementById("recipientList");

let recipients = [];

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function renderLuckyList() {
  luckyListEl.innerHTML = "";
  LUCKY_AMOUNTS.forEach((amt) => {
    const btn = document.createElement("button");
    btn.className = "lucky-btn";
    btn.textContent = amt.toLocaleString();
    btn.addEventListener("click", () => {
      const n = parseInt(recipientCountEl.value, 10) || 1;
      totalBudgetEl.value = amt * n;
      suggestAmounts();
    });
    luckyListEl.appendChild(btn);
  });
}

function suggestAmounts() {
  const total = parseInt(totalBudgetEl.value, 10);
  const count = parseInt(recipientCountEl.value, 10) || 1;
  const currency = currencyEl.value;

  if (!total || total <= 0 || count <= 0) {
    resultSection.classList.add("hidden");
    return;
  }

  const perPerson = Math.floor(total / count);
  const remainder = total % count;

  perPersonEl.textContent = perPerson.toLocaleString();
  currencyLabelEl.textContent = currency;

  const locale = getLocale();
  if (remainder > 0) {
    resultNoteEl.textContent =
      (locale === "zh-HK" || locale === "zh-Hant")
        ? `總計 ${total.toLocaleString()} ${currency}，${count} 人分後餘 ${remainder} ${currency}（可加在某一封）。`
        : `Total ${total.toLocaleString()} ${currency}; remainder ${remainder} ${currency} after splitting (add to one envelope).`;
  } else {
    resultNoteEl.textContent =
      (locale === "zh-HK" || locale === "zh-Hant")
        ? `總計 ${total.toLocaleString()} ${currency}，啱啱好 ${count} 人平分。`
        : `Total ${total.toLocaleString()} ${currency}, evenly split.`;
  }

  resultSection.classList.remove("hidden");
}

function findNearestLucky(amount) {
  let best = LUCKY_AMOUNTS[0];
  let bestDiff = Math.abs(amount - best);
  LUCKY_AMOUNTS.forEach((l) => {
    const d = Math.abs(amount - l);
    if (d < bestDiff) {
      bestDiff = d;
      best = l;
    }
  });
  return best;
}

function addRecipient() {
  const name = recipientNameEl.value.trim();
  if (!name) return;
  recipients.push(name);
  recipientNameEl.value = "";
  const li = document.createElement("li");
  li.textContent = name;
  const rm = document.createElement("button");
  rm.className = "remove-btn";
  rm.textContent = "×";
  rm.setAttribute("aria-label", "Remove");
  rm.addEventListener("click", () => {
    recipients = recipients.filter((r) => r !== name);
    li.remove();
  });
  li.appendChild(rm);
  recipientListEl.appendChild(li);
}

function copySummary() {
  const total = totalBudgetEl.value;
  const count = recipientCountEl.value;
  const per = perPersonEl.textContent;
  const cur = currencyLabelEl.textContent;
  const locale = getLocale();
  let text =
    (locale === "zh-HK" || locale === "zh-Hant")
      ? `利是摘要：總預算 ${total} ${cur}，${count} 人，每人約 ${per} ${cur}。`
      : `Red envelope summary: total ${total} ${cur}, ${count} recipients, ~${per} ${cur} each.`;
  if (recipients.length) {
    text += "\n" + recipients.map((r, i) => `${i + 1}. ${r}: ${per} ${cur}`).join("\n");
  }
  navigator.clipboard.writeText(text).then(() => {
    const btn = copyBtn;
    const orig = btn.textContent;
    btn.textContent = (getLocale() === "zh-HK" || getLocale() === "zh-Hant") ? "已複製！" : "Copied!";
    setTimeout(() => (btn.textContent = orig), 1500);
  });
}

calcBtn.addEventListener("click", suggestAmounts);
totalBudgetEl.addEventListener("change", suggestAmounts);
recipientCountEl.addEventListener("change", suggestAmounts);
currencyEl.addEventListener("change", () => {
  currencyLabelEl.textContent = currencyEl.value;
  suggestAmounts();
});
copyBtn.addEventListener("click", copySummary);
addRecipientBtn.addEventListener("click", addRecipient);
recipientNameEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addRecipient();
});

renderLuckyList();
