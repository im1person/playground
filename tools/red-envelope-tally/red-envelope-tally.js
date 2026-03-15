(function () {
  const STORAGE_KEY = "red-envelope-tally";
  const CURRENCY_KEY = "red-envelope-tally-currency";

  const totalEl = document.getElementById("total");
  const countEl = document.getElementById("count");
  const statsEl = document.getElementById("stats");
  const currencyLabel = document.getElementById("currencyLabel");
  const customRow = document.getElementById("customRow");
  const customInput = document.getElementById("customInput");
  const customAdd = document.getElementById("customAdd");
  const customBtn = document.getElementById("customBtn");
  const undoBtn = document.getElementById("undoBtn");
  const resetBtn = document.getElementById("resetBtn");
  const finishBtn = document.getElementById("finishBtn");
  const chipsEl = document.getElementById("chips");
  const finishScene = document.getElementById("finishScene");
  const finishBackdrop = document.getElementById("finishBackdrop");
  const finishTotal = document.getElementById("finishTotal");
  const finishCurrency = document.getElementById("finishCurrency");
  const finishNotes = document.getElementById("finishNotes");
  const finishClose = document.getElementById("finishClose");
  const finishSub = document.getElementById("finishSub");
  const finishModeStandard = document.getElementById("finishModeStandard");
  const finishModeRaw = document.getElementById("finishModeRaw");

  const DENOMS = [1000, 500, 100, 50, 20, 10];
  var finishDisplayMode = "standard";

  let list = [];
  let currency = "HKD";

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) list = JSON.parse(raw);
      else list = [];
      const cur = localStorage.getItem(CURRENCY_KEY);
      if (cur) currency = cur;
    } catch (_) {
      list = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch (_) {}
  }

  function sum() {
    return list.reduce(function (a, b) { return a + b; }, 0);
  }

  function getStats() {
    var counts = {};
    list.forEach(function (amount) {
      counts[amount] = (counts[amount] || 0) + 1;
    });
    return counts;
  }

  function render() {
    const total = sum();
    totalEl.textContent = total.toLocaleString();
    const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    countEl.textContent = isZh ? list.length + " 封" : list.length + " envelopes";
    countEl.setAttribute("data-en", list.length + " envelopes");
    countEl.setAttribute("data-zh-HK", list.length + " 封");
    currencyLabel.textContent = currency;
    undoBtn.disabled = list.length === 0;
    resetBtn.disabled = list.length === 0;
    finishBtn.disabled = list.length === 0;

    var counts = getStats();
    var amounts = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    statsEl.textContent = amounts.length === 0 ? "" : amounts.map(function (a) { return a + "×" + counts[a]; }).join("  ");
    statsEl.hidden = amounts.length === 0;

    chipsEl.innerHTML = "";
    var amounts = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    amounts.forEach(function (amount) {
      var n = counts[amount];
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("data-amount", amount);
      chip.textContent = amount.toLocaleString() + "×" + n;
      chip.addEventListener("click", function () {
        var idx = list.indexOf(amount);
        if (idx !== -1) {
          list.splice(idx, 1);
          save();
          render();
        }
      });
      chipsEl.appendChild(chip);
    });
  }

  function addAmount(amount) {
    var n = parseInt(amount, 10);
    if (isNaN(n) || n < 1) return;
    list.push(n);
    save();
    totalEl.classList.add("just-updated");
    setTimeout(function () { totalEl.classList.remove("just-updated"); }, 280);
    render();
  }

  function undo() {
    if (list.length === 0) return;
    list.pop();
    save();
    render();
  }

  function reset() {
    if (list.length === 0) return;
    var isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    if (!confirm(isZh ? "確定清除全部？" : "Clear all?")) return;
    list = [];
    save();
    render();
  }

  function breakdown(total) {
    var rest = total;
    var out = {};
    DENOMS.forEach(function (d) {
      var n = Math.floor(rest / d);
      if (n > 0) {
        out[d] = n;
        rest -= n * d;
      }
    });
    return out;
  }

  function noteClass(amount) {
    return DENOMS.indexOf(amount) !== -1 ? "finish-note-" + amount : "finish-note-custom";
  }

  function renderFinishNotes() {
    finishNotes.innerHTML = "";
    finishNotes.classList.remove("is-raw");
    var total = sum();
    if (finishDisplayMode === "raw") {
      finishNotes.classList.add("is-raw");
      var n = list.length;
      if (n === 0) return;
      var sector = document.createElement("div");
      sector.className = "finish-raw-sector";
      // Redesign: cards placed ON an arc (10 o'clock to 2 o'clock), radius in px; keep arc high so no overlap with btn
      var SECTOR_W = 300;
      var SECTOR_H = 150;
      var RADIUS = 72;
      var CY = 130;
      var CARD_W = 52;
      var CARD_H = 36;
      var START_DEG = -150;
      var SPAN_DEG = 120;
      var cx = SECTOR_W / 2;
      var cy = CY;
      for (var i = 0; i < n; i++) {
        var amount = list[i];
        var note = document.createElement("div");
        note.className = "finish-note " + noteClass(amount);
        note.setAttribute("data-amount", amount);
        note.textContent = amount;
        var angleDeg = n === 1 ? -90 : START_DEG + (i / (n - 1)) * SPAN_DEG;
        var rad = (angleDeg * Math.PI) / 180;
        var bx = cx + RADIUS * Math.sin(rad);
        var by = cy - RADIUS * Math.cos(rad);
        var leftPx = bx - CARD_W / 2;
        var topPx = by - CARD_H;
        note.style.left = leftPx + "px";
        note.style.top = topPx + "px";
        note.style.transform = "rotate(" + angleDeg + "deg)";
        note.style.transformOrigin = (CARD_W / 2) + "px " + CARD_H + "px";
        sector.appendChild(note);
      }
      finishNotes.appendChild(sector);
    } else {
      var counts = breakdown(total);
      DENOMS.forEach(function (d) {
        var n = counts[d] || 0;
        for (var i = 0; i < n; i++) {
          var note = document.createElement("div");
          note.className = "finish-note finish-note-" + d;
          note.setAttribute("data-amount", d);
          note.textContent = d;
          finishNotes.appendChild(note);
        }
      });
    }
  }

  function updateFinishSub() {
    var isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    if (finishDisplayMode === "raw") {
      finishSub.textContent = isZh ? "逐封輸入嘅金額" : "Amount of each envelope";
    } else {
      finishSub.textContent = isZh ? "即係等於" : "Like having these notes";
    }
  }

  function showFinish() {
    if (list.length === 0) return;
    finishDisplayMode = "standard";
    var total = sum();
    finishTotal.textContent = total.toLocaleString();
    finishCurrency.textContent = currency;
    finishModeStandard.classList.add("active");
    finishModeRaw.classList.remove("active");
    updateFinishSub();
    renderFinishNotes();
    finishScene.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function hideFinish() {
    finishScene.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  finishBtn.addEventListener("click", showFinish);
  finishClose.addEventListener("click", function (e) { e.preventDefault(); hideFinish(); });
  finishBackdrop.addEventListener("click", hideFinish);
  finishModeStandard.addEventListener("click", function () {
    finishDisplayMode = "standard";
    finishModeStandard.classList.add("active");
    finishModeRaw.classList.remove("active");
    updateFinishSub();
    renderFinishNotes();
  });
  finishModeRaw.addEventListener("click", function () {
    finishDisplayMode = "raw";
    finishModeRaw.classList.add("active");
    finishModeStandard.classList.remove("active");
    updateFinishSub();
    renderFinishNotes();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && finishScene.classList.contains("is-open")) hideFinish();
  });

  document.querySelectorAll(".qty-btn[data-amount]").forEach(function (btn) {
    if (btn.id === "customBtn") return;
    btn.addEventListener("click", function () {
      addAmount(btn.dataset.amount);
    });
  });

  customBtn.addEventListener("click", function () {
    customRow.hidden = !customRow.hidden;
    if (!customRow.hidden) {
      customInput.value = "";
      customInput.focus();
    }
  });

  customAdd.addEventListener("click", function () {
    addAmount(customInput.value);
    customInput.value = "";
    customInput.focus();
  });
  customInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      addAmount(customInput.value);
      customInput.value = "";
    }
  });

  undoBtn.addEventListener("click", undo);
  resetBtn.addEventListener("click", reset);

  load();
  render();
})();
