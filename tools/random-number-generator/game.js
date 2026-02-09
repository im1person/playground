// 初始化排除數字的容器
const excludeNumbersContainer = document.getElementById(
  "excludeNumbersContainer"
);
const excludeNumbers = new Set();

// 定義顏色對應
const numberColors = {
  1: "#d9716d",
  2: "#d9716d",
  7: "#d9716d",
  8: "#d9716d",
  12: "#d9716d",
  13: "#d9716d",
  18: "#d9716d",
  19: "#d9716d",
  23: "#d9716d",
  24: "#d9716d",
  29: "#d9716d",
  30: "#d9716d",
  34: "#d9716d",
  35: "#d9716d",
  40: "#d9716d",
  45: "#d9716d",
  46: "#d9716d",
  3: "#4b7185",
  4: "#4b7185",
  9: "#4b7185",
  10: "#4b7185",
  14: "#4b7185",
  15: "#4b7185",
  20: "#4b7185",
  25: "#4b7185",
  26: "#4b7185",
  31: "#4b7185",
  36: "#4b7185",
  37: "#4b7185",
  41: "#4b7185",
  42: "#4b7185",
  47: "#4b7185",
  48: "#4b7185",
  5: "#8bb16f",
  6: "#8bb16f",
  11: "#8bb16f",
  15: "#8bb16f",
  16: "#8bb16f",
  17: "#8bb16f",
  21: "#8bb16f",
  22: "#8bb16f",
  27: "#8bb16f",
  28: "#8bb16f",
  32: "#8bb16f",
  33: "#8bb16f",
  38: "#8bb16f",
  39: "#8bb16f",
  43: "#8bb16f",
  44: "#8bb16f",
  49: "#8bb16f",
};

// 創建 1 到 49 的按鈕
for (let i = 1; i <= 49; i++) {
  const button = document.createElement("div");
  button.className = "exclude-number";
  button.textContent = i;
  button.style.backgroundColor = numberColors[i] || "#fff"; // 設置背景顏色
  button.onclick = () => toggleExcludeNumber(i);
  excludeNumbersContainer.appendChild(button);
}

function toggleExcludeNumber(num) {
  if (excludeNumbers.has(num)) {
    excludeNumbers.delete(num);
  } else {
    excludeNumbers.add(num);
  }
  updateExcludeButtons();
}

function updateExcludeButtons() {
  const buttons = document.querySelectorAll(".exclude-number");
  buttons.forEach((button) => {
    const num = parseInt(button.textContent, 10);
    button.classList.toggle("selected", excludeNumbers.has(num));
  });
}

function getResultPrefix(i) {
  const locale = localStorage.getItem("playground-locale") || "zh-HK";
  if (locale === "en") {
    return `Run ${i}:`;
  } else {
    return `第 ${i} 次:`;
  }
}

// Remove lastResults, lastPickCount, rerenderResults
// In generateNumbers, do not store lastResults
function generateNumbers() {
  const pickCount = Math.min(
    Math.max(parseInt(document.getElementById("pickCount").value, 10), 6),
    48
  );
  const runTimes = Math.min(
    Math.max(parseInt(document.getElementById("runTimes").value, 10), 1),
    9999
  );

  let resultHTML = "";

  for (let i = 0; i < runTimes; i++) {
    const numbers = [];
    const availableNumbers = Array.from({ length: 49 }, (_, i) => i + 1).filter(
      (num) => !excludeNumbers.has(num)
    ); // 排除選擇的數字

    for (let j = 0; j < pickCount; j++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      numbers.push(availableNumbers.splice(randomIndex, 1)[0]);
    }

    numbers.sort((a, b) => a - b);

    const coloredNumbers = numbers.map((num) => {
      let color;
      if (
        [
          1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46,
        ].includes(num)
      ) {
        color = "#d9716d"; // 紅球
      } else if (
        [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48].includes(
          num
        )
      ) {
        color = "#4b7185"; // 藍球
      } else {
        color = "#8bb16f"; // 綠球
      }
      return `<span class="ball" style="background-color: ${color}"><span>${num
        .toString()
        .padStart(2, " ")}</span></span>`;
    });

    resultHTML += `<span class="result-line">${getResultPrefix(
      i + 1
    )} ${coloredNumbers.join("")}</span>`;
  }

  document.getElementById("result").innerHTML = resultHTML;
}

// Remove lastResults, lastPickCount, rerenderResults
function updatePickCount() {
  const pickCount = document.getElementById("pickCount");
  const pickCountSlider = document.getElementById("pickCountSlider");
  if (document.activeElement !== pickCount) {
    pickCount.value = pickCountSlider.value;
  }
  pickCountSlider.value = pickCount.value;
}

function updateRunTimes() {
  const runTimes = document.getElementById("runTimes");
  const runTimesSlider = document.getElementById("runTimesSlider");

  // 檢查並限制輸入值
  let value = parseInt(runTimes.value);
  if (isNaN(value) || value < 1) {
    value = 1;
  } else if (value > 9999) {
    value = 9999;
  }

  runTimes.value = value;
  runTimesSlider.value = Math.min(value, 100);
}

function updateRunTimesFromSlider() {
  const runTimes = document.getElementById("runTimes");
  const runTimesSlider = document.getElementById("runTimesSlider");

  runTimes.value = runTimesSlider.value;
}

// 添加事件監聽器
document.getElementById("pickCount").addEventListener("input", updatePickCount);
document
  .getElementById("pickCountSlider")
  .addEventListener("input", updatePickCount);
document.getElementById("runTimes").addEventListener("input", updateRunTimes);
document
  .getElementById("runTimesSlider")
  .addEventListener("input", updateRunTimesFromSlider);
// Update generate button to use locale
document.getElementById("generateBtn").onclick = generateNumbers;
