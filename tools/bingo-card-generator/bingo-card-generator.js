(function () {
  const DEFAULT_WORDS = "Bingo\nFun\nPlay\nGame\nWin\nLuck\nStar\nCard\nGrid\nFree\nMark\nCall\nRoll\nSpin\nDraw\nPick\nMatch\nLine\nGoal\nParty\nPrize\nCheer\nTeam\nJoy";
  const wordsInput = document.getElementById("wordsInput");
  const generateBtn = document.getElementById("generateBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const printBtn = document.getElementById("printBtn");
  const gridEl = document.getElementById("bingoGrid");

  let currentCells = [];
  let currentWords = [];

  function parseWords() {
    const text = wordsInput.value.trim() || DEFAULT_WORDS;
    return text.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildGrid() {
    const words = parseWords();
    let list = shuffle(words).slice(0, 25);
    if (list.length < 25) {
      while (list.length < 25) list.push("—");
      list = shuffle(list);
    }
    currentWords = list;
    gridEl.innerHTML = "";
    const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    const freeLabel = isZh ? "自由" : "FREE";
    for (let i = 0; i < 25; i++) {
      const cell = document.createElement("div");
      cell.className = "bingo-cell" + (i === 12 ? " free" : "");
      cell.textContent = i === 12 ? freeLabel : list[i];
      cell.dataset.index = i;
      if (i !== 12) {
        cell.addEventListener("click", function () {
          cell.classList.toggle("checked");
        });
      }
      gridEl.appendChild(cell);
      currentCells.push(cell);
    }
  }

  generateBtn.addEventListener("click", buildGrid);
  shuffleBtn.addEventListener("click", function () {
    if (currentWords.length !== 25) return;
    const center = currentWords[12];
    let rest = currentWords.filter(function (_, i) { return i !== 12; });
    rest = shuffle(rest);
    rest.splice(12, 0, center);
    currentWords = rest;
    currentCells.forEach(function (cell, i) {
      const isFree = i === 12;
      cell.textContent = isFree ? (document.documentElement.lang === "zh-HK" ? "自由" : "FREE") : rest[i];
      cell.classList.remove("checked");
      if (isFree) cell.classList.add("free"); else cell.classList.remove("free");
    });
  });
  printBtn.addEventListener("click", function () {
    window.print();
  });

  if (!wordsInput.value.trim()) wordsInput.value = DEFAULT_WORDS;
  buildGrid();
})();
