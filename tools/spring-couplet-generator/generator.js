// Spring Couplet Generator
const templateRadios = document.querySelectorAll('input[name="template"]');
const fullInputs = document.getElementById("fullInputs");
const singleInputs = document.getElementById("singleInputs");
const horizontalEl = document.getElementById("horizontal");
const topLineEl = document.getElementById("topLine");
const bottomLineEl = document.getElementById("bottomLine");
const singleCharEl = document.getElementById("singleChar");
const previewEl = document.getElementById("preview");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");

function getTemplate() {
  return document.querySelector('input[name="template"]:checked').value;
}

function updateVisibility() {
  const t = getTemplate();
  if (t === "full") {
    fullInputs.classList.remove("hidden");
    singleInputs.classList.add("hidden");
  } else {
    fullInputs.classList.add("hidden");
    singleInputs.classList.remove("hidden");
  }
  renderPreview();
}

function renderPreview() {
  const t = getTemplate();
  previewEl.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "couplet-paper";

  if (t === "full") {
    const h = (horizontalEl.value || "吉祥如意").trim() || "吉祥如意";
    const top = (topLineEl.value || "迎春接福").trim() || "迎春接福";
    const bottom = (bottomLineEl.value || "納福迎祥").trim() || "納福迎祥";
    wrap.innerHTML = `
      <div class="horizontal">${escapeHtml(h)}</div>
      <div class="vertical top">${escapeHtml(top)}</div>
      <div class="vertical bottom">${escapeHtml(bottom)}</div>
    `;
  } else {
    const char = (singleCharEl.value || "福").trim().slice(0, 1) || "福";
    wrap.innerHTML = `<div class="single">${escapeHtml(char)}</div>`;
  }
  previewEl.appendChild(wrap);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

templateRadios.forEach((r) => r.addEventListener("change", updateVisibility));
horizontalEl.addEventListener("input", renderPreview);
topLineEl.addEventListener("input", renderPreview);
bottomLineEl.addEventListener("input", renderPreview);
singleCharEl.addEventListener("input", renderPreview);

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const h = btn.getAttribute("data-h");
    const t = btn.getAttribute("data-t");
    const b = btn.getAttribute("data-b");
    if (h) horizontalEl.value = h;
    if (t) topLineEl.value = t;
    if (b) bottomLineEl.value = b;
    document.querySelector('input[name="template"][value="full"]').checked = true;
    updateVisibility();
  });
});

function drawToCanvas() {
  const wrap = previewEl.querySelector(".couplet-paper");
  if (!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const scale = 2;
  const w = Math.round(rect.width * scale);
  const h = Math.round(rect.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#c62828";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const template = getTemplate();
  if (template === "full") {
    const hText = (horizontalEl.value || "吉祥如意").trim() || "吉祥如意";
    const topText = (topLineEl.value || "迎春接福").trim() || "迎春接福";
    const bottomText = (bottomLineEl.value || "納福迎祥").trim() || "納福迎祥";
    const cx = rect.width / 2;
    ctx.font = `bold ${Math.min(32, 320 / Math.max(hText.length, 1))}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
    ctx.fillText(hText, cx, rect.height * 0.2);
    ctx.save();
    ctx.translate(rect.width * 0.2, rect.height * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `bold ${Math.min(28, 200 / Math.max(topText.length, 1))}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
    ctx.fillText(topText, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(rect.width * 0.8, rect.height * 0.5);
    ctx.rotate(Math.PI / 2);
    ctx.font = `bold ${Math.min(28, 200 / Math.max(bottomText.length, 1))}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
    ctx.fillText(bottomText, 0, 0);
    ctx.restore();
  } else {
    const char = (singleCharEl.value || "福").trim().slice(0, 1) || "福";
    const fontSize = Math.min(120, rect.width * 0.4, rect.height * 0.4);
    ctx.font = `bold ${fontSize}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
    ctx.fillText(char, rect.width / 2, rect.height / 2);
  }
  return canvas;
}

downloadBtn.addEventListener("click", () => {
  const canvas = drawToCanvas();
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = "spring-couplet.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

printBtn.addEventListener("click", () => {
  window.print();
});

updateVisibility();
