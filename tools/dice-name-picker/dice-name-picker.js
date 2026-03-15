(function () {
  const diceCount = document.getElementById("diceCount");
  const diceSides = document.getElementById("diceSides");
  const rollBtn = document.getElementById("rollBtn");
  const diceRow = document.getElementById("diceRow");
  const diceSum = document.getElementById("diceSum");
  const namesInput = document.getElementById("namesInput");
  const pickBtn = document.getElementById("pickBtn");
  const nameResult = document.getElementById("nameResult");

  rollBtn.addEventListener("click", function () {
    const n = Math.max(1, Math.min(6, parseInt(diceCount.value, 10) || 2));
    const sides = Math.max(2, Math.min(20, parseInt(diceSides.value, 10) || 6));
    diceRow.innerHTML = "";
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = 1 + Math.floor(Math.random() * sides);
      sum += v;
      const div = document.createElement("div");
      div.className = "die";
      div.textContent = v;
      div.setAttribute("aria-label", "die " + (i + 1) + " " + v);
      diceRow.appendChild(div);
    }
    const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    diceSum.textContent = (isZh ? "總和：" : "Sum: ") + sum;
  });

  pickBtn.addEventListener("click", function () {
    const text = namesInput.value.trim();
    const names = text.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (names.length === 0) {
      nameResult.textContent = document.documentElement.lang === "zh-HK" ? "請輸入至少一個名。" : "Enter at least one name.";
      return;
    }
    const picked = names[Math.floor(Math.random() * names.length)];
    nameResult.textContent = picked;
  });
})();
