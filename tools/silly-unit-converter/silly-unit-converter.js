(function () {
  const REFS = {
    m: 1,
    km: 1000,
    footballPitch: 105,
    elephant: 4,
    bus: 12,
    ml: 1,
    L: 1000,
    coffeeCup: 200,
    bathTub: 150000,
    olympicPool: 2.5e6,
    kg: 1,
    blueWhale: 180000,
    apple: 0.2
  };

  const fromUnit = document.getElementById("fromUnit");
  const amountInput = document.getElementById("amount");
  const resultEl = document.getElementById("result");

  const enSentences = {
    length: function (val, unit) {
      const parts = [];
      if (unit === "m" || unit === "km") {
        const m = unit === "km" ? val * 1000 : val;
        if (m >= 1000) parts.push("about " + (m / REFS.footballPitch).toFixed(1) + " football pitches long");
        if (m >= 10) parts.push("about " + (m / REFS.bus).toFixed(1) + " buses");
        if (m >= 1) parts.push("about " + (m / REFS.elephant).toFixed(1) + " elephants laid end to end");
      }
      return parts.length ? parts.join("; ") + "." : "";
    },
    volume: function (val, unit) {
      const ml = unit === "L" ? val * 1000 : val;
      const parts = [];
      if (ml >= 1e6) parts.push("about " + (ml / REFS.olympicPool).toFixed(2) + " Olympic swimming pools");
      if (ml >= 100000) parts.push("about " + (ml / REFS.bathTub).toFixed(1) + " bathtubs");
      if (ml >= 200) parts.push("about " + (ml / REFS.coffeeCup).toFixed(1) + " cups of coffee");
      return parts.length ? parts.join("; ") + "." : "";
    },
    mass: function (val) {
      const parts = [];
      if (val >= 1000) parts.push("about " + (val / REFS.blueWhale).toFixed(2) + " blue whales");
      if (val >= 0.1) parts.push("about " + (val / REFS.apple).toFixed(0) + " apples");
      return parts.length ? parts.join("; ") + "." : "";
    }
  };

  const zhSentences = {
    length: function (val, unit) {
      const parts = [];
      if (unit === "m" || unit === "km") {
        const m = unit === "km" ? val * 1000 : val;
        if (m >= 1000) parts.push("大約 " + (m / REFS.footballPitch).toFixed(1) + " 個足球場長");
        if (m >= 10) parts.push("大約 " + (m / REFS.bus).toFixed(1) + " 架巴士");
        if (m >= 1) parts.push("大約 " + (m / REFS.elephant).toFixed(1) + " 隻大象頭尾相接");
      }
      return parts.length ? parts.join("；") + "。" : "";
    },
    volume: function (val, unit) {
      const ml = unit === "L" ? val * 1000 : val;
      const parts = [];
      if (ml >= 1e6) parts.push("大約 " + (ml / REFS.olympicPool).toFixed(2) + " 個奧運泳池");
      if (ml >= 100000) parts.push("大約 " + (ml / REFS.bathTub).toFixed(1) + " 個浴缸");
      if (ml >= 200) parts.push("大約 " + (ml / REFS.coffeeCup).toFixed(1) + " 杯咖啡");
      return parts.length ? parts.join("；") + "。" : "";
    },
    mass: function (val) {
      const parts = [];
      if (val >= 1000) parts.push("大約 " + (val / REFS.blueWhale).toFixed(2) + " 條藍鯨");
      if (val >= 0.1) parts.push("大約 " + (val / REFS.apple).toFixed(0) + " 個蘋果");
      return parts.length ? parts.join("；") + "。" : "";
    }
  };

  function update() {
    const val = parseFloat(amountInput.value, 10);
    const unit = fromUnit.value;
    if (isNaN(val) || val < 0) {
      resultEl.textContent = "";
      return;
    }
    const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    const S = isZh ? zhSentences : enSentences;
    let text = "";
    if (unit === "m" || unit === "km") text = S.length(val, unit);
    else if (unit === "ml" || unit === "L") text = S.volume(val, unit);
    else if (unit === "kg") text = S.mass(val);
    resultEl.textContent = text || (isZh ? "試下輸入大啲嘅數字。" : "Try a larger number for silly comparisons.");
  }

  amountInput.addEventListener("input", update);
  fromUnit.addEventListener("change", update);
  update();
})();
