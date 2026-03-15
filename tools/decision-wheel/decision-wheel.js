(function () {
  const optionsInput = document.getElementById("optionsInput");
  const spinBtn = document.getElementById("spinBtn");
  const wheelEl = document.getElementById("wheel");
  const resultEl = document.getElementById("result");

  const COLORS = ["#e3f2fd", "#fff3e0", "#e8f5e9", "#fce4ec", "#f3e5f5", "#e0f7fa", "#fff8e1", "#efebe9"];

  function parseOptions(text) {
    const s = text.trim().replace(/,/g, "\n");
    return s.split(/\n/).map(function (t) { return t.trim(); }).filter(Boolean);
  }

  function buildWheel(items) {
    wheelEl.innerHTML = "";
    const n = items.length;
    if (n === 0) return;
    const degPer = 360 / n;
    const toRad = function (d) { return d * Math.PI / 180; };
    items.forEach(function (label, i) {
      const seg = document.createElement("div");
      seg.className = "wheel-segment";
      var span = document.createElement("span");
      span.textContent = label.length > 10 ? label.slice(0, 9) + "…" : label;
      seg.appendChild(span);
      seg.style.background = COLORS[i % COLORS.length];
      const a1 = toRad(i * degPer);
      const a2 = toRad((i + 1) * degPer);
      const x1 = 50 + 50 * Math.cos(a1);
      const y1 = 50 - 50 * Math.sin(a1);
      const x2 = 50 + 50 * Math.cos(a2);
      const y2 = 50 - 50 * Math.sin(a2);
      seg.style.clipPath = "polygon(50% 50%, " + x1 + "% " + y1 + "%, " + x2 + "% " + y2 + "%)";
      seg.style.transform = "none";
      seg.style.border = "none";
      wheelEl.appendChild(seg);
    });
  }

  spinBtn.addEventListener("click", function () {
    const options = parseOptions(optionsInput.value);
    if (options.length < 2) {
      resultEl.textContent = document.documentElement.lang === "zh-HK" ? "請輸入至少兩個選項。" : "Enter at least 2 options.";
      return;
    }
    buildWheel(options);
    const index = Math.floor(Math.random() * options.length);
    const n = options.length;
    const degPer = 360 / n;
    const targetAngle = 360 * 5 + (360 - index * degPer - degPer / 2);
    wheelEl.style.transform = "rotate(" + targetAngle + "deg)";
    spinBtn.disabled = true;
    setTimeout(function () {
      resultEl.textContent = options[index];
      spinBtn.disabled = false;
    }, 2100);
  });
})();
