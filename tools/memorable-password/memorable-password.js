(function () {
  const WORDS = [
    "apple", "beach", "cloud", "dance", "eagle", "flame", "grape", "house", "ice", "jazz",
    "kite", "lake", "moon", "night", "ocean", "pear", "queen", "river", "star", "tree",
    "umber", "violet", "water", "xray", "yellow", "zebra", "battery", "correct", "horse",
    "staple", "purple", "orange", "silver", "castle", "puzzle", "garden", "shadow", "thunder",
    "forest", "winter", "summer", "spring", "autumn", "coffee", "pencil", "rocket", "tiger",
    "dragon", "camera", "piano", "violin", "magnet", "pocket", "silver", "golden", "crystal"
  ];

  const modeSelect = document.getElementById("mode");
  const memorableOpts = document.getElementById("memorableOpts");
  const randomOpts = document.getElementById("randomOpts");
  const wordCount = document.getElementById("wordCount");
  const lengthInput = document.getElementById("length");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const output = document.getElementById("output");

  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const NUMS = "0123456789";
  const SYMS = "!@#$%&*+-=?";

  modeSelect.addEventListener("change", function () {
    const isMemorable = this.value === "memorable";
    memorableOpts.style.display = isMemorable ? "block" : "none";
    randomOpts.style.display = isMemorable ? "none" : "block";
  });

  function getMemorable() {
    const n = Math.max(4, Math.min(8, parseInt(wordCount.value, 10) || 5));
    const chosen = [];
    for (let i = 0; i < n; i++) {
      chosen.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    }
    return chosen.join("-");
  }

  function getRandom() {
    let len = Math.max(8, Math.min(64, parseInt(lengthInput.value, 10) || 16));
    let pool = "";
    if (document.getElementById("uppercase").checked) pool += UPPER;
    if (document.getElementById("lowercase").checked) pool += LOWER;
    if (document.getElementById("numbers").checked) pool += NUMS;
    if (document.getElementById("symbols").checked) pool += SYMS;
    if (!pool) pool = LOWER + NUMS;
    let s = "";
    for (let i = 0; i < len; i++) s += pool[Math.floor(Math.random() * pool.length)];
    return s;
  }

  function generate() {
    const isMemorable = modeSelect.value === "memorable";
    output.textContent = isMemorable ? getMemorable() : getRandom();
  }

  generateBtn.addEventListener("click", generate);
  copyBtn.addEventListener("click", function () {
    const text = output.textContent.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      copyBtn.textContent = document.documentElement.lang === "zh-HK" ? "已複製" : "Copied!";
      setTimeout(function () {
        copyBtn.textContent = (document.documentElement.lang === "zh-HK" ? copyBtn.dataset.zhHk : copyBtn.dataset.en) || "Copy";
      }, 1500);
    });
  });

  generate();
})();
