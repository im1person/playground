// Spring Couplet Match – match pairs of lucky (意頭) characters
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const scoreEl = document.getElementById("score");
const matchesEl = document.getElementById("matches");
const levelEl = document.getElementById("level");

canvas.width = 800;
canvas.height = 600;

let gameState = "waiting";
let score = 0;
let matches = 0;
let level = 1;
let cards = [];
let selectedCard = null;
let animationFrame = null;
let phase = "idle"; // "peek" = cards face up with countdown, "playing" = cards closed
let peekTimeLeft = 3;
let lastPeekTick = 0;
const PEEK_DURATION = 3;
let isFlippingBack = false; // block clicks while wrong pair is closing

const CHARS = [
  { char: "春", en: "Spring" },
  { char: "福", en: "Fortune" },
  { char: "祿", en: "Prosperity" },
  { char: "壽", en: "Longevity" },
  { char: "吉", en: "Auspicious" },
  { char: "祥", en: "Lucky" },
  { char: "如", en: "As" },
  { char: "意", en: "Wish" },
  { char: "龍", en: "Dragon" },
  { char: "鳳", en: "Phoenix" },
  { char: "財", en: "Wealth" },
  { char: "安", en: "Peace" },
];

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

class CoupletCard {
  constructor(x, y, item, id) {
    this.x = x;
    this.y = y;
    this.item = item;
    this.id = id;
    this.size = 48;
    this.selected = false;
    this.matched = false;
    this.alpha = 1;
  }

  draw(showFace) {
    if (this.matched) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    const left = this.x - this.size;
    const top = this.y - this.size;
    const w = this.size * 2;
    const h = this.size * 2;
    const r = 8;

    if (this.selected) {
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(left + r, top);
      ctx.lineTo(left + w - r, top);
      ctx.quadraticCurveTo(left + w, top, left + w, top + r);
      ctx.lineTo(left + w, top + h - r);
      ctx.quadraticCurveTo(left + w, top + h, left + w - r, top + h);
      ctx.lineTo(left + r, top + h);
      ctx.quadraticCurveTo(left, top + h, left, top + h - r);
      ctx.lineTo(left, top + r);
      ctx.quadraticCurveTo(left, top, left + r, top);
      ctx.stroke();
    }

    ctx.fillStyle = "#c62828";
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + r, top);
    ctx.lineTo(left + w - r, top);
    ctx.quadraticCurveTo(left + w, top, left + w, top + r);
    ctx.lineTo(left + w, top + h - r);
    ctx.quadraticCurveTo(left + w, top + h, left + w - r, top + h);
    ctx.lineTo(left + r, top + h);
    ctx.quadraticCurveTo(left, top + h, left, top + h - r);
    ctx.lineTo(left, top + r);
    ctx.quadraticCurveTo(left, top, left + r, top);
    if (!showFace) ctx.fillStyle = "#8b0000";
    ctx.fill();
    ctx.stroke();

    if (showFace) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${this.size}px "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.item.char, this.x, this.y);
    } else {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", this.x, this.y);
    }

    ctx.restore();
  }

  contains(x, y) {
    return (
      x >= this.x - this.size &&
      x <= this.x + this.size &&
      y >= this.y - this.size &&
      y <= this.y + this.size
    );
  }

  fadeOut() {
    this.alpha -= 0.06;
    if (this.alpha <= 0) this.matched = true;
  }
}

function generateCards() {
  cards = [];
  const numPairs = Math.min(4 + level, 12);
  const items = CHARS.slice(0, numPairs);
  const pairs = [];
  items.forEach((item) => {
    pairs.push(item);
    pairs.push(item);
  });
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  const cols = 6;
  const rows = Math.ceil(pairs.length / cols);
  const spacingX = canvas.width / (cols + 1);
  const spacingY = canvas.height / (rows + 1);
  let id = 0;
  for (let i = 0; i < pairs.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = spacingX * (col + 1);
    const y = spacingY * (row + 1) + 40;
    cards.push(new CoupletCard(x, y, pairs[i], id++));
  }
}

canvas.addEventListener("click", (e) => {
  if (gameState !== "playing" || phase !== "playing" || isFlippingBack) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const clicked = cards.find((c) => !c.matched && c.contains(x, y));
  if (!clicked) return;
  if (selectedCard === clicked) {
    clicked.selected = false;
    selectedCard = null;
    return;
  }
  if (clicked.selected) return;
  if (!selectedCard) {
    selectedCard = clicked;
    clicked.selected = true;
  } else {
    clicked.selected = true;
    if (selectedCard.item === clicked.item) {
      selectedCard.matched = true;
      clicked.matched = true;
      matches++;
      score += 10 * level;
      matchesEl.textContent = matches;
      scoreEl.textContent = score;
      selectedCard.selected = false;
      clicked.selected = false;
      selectedCard = null;
      const allMatched = cards.every((c) => c.matched);
      if (allMatched) {
        level++;
        levelEl.textContent = level;
        gameOver.classList.remove("hidden");
        const locale = getLocale();
        finalScore.textContent =
          (locale === "zh-HK" || locale === "zh-Hant")
            ? `得分: ${score} | 配對: ${matches} | 等級: ${level}`
            : `Score: ${score} | Matches: ${matches} | Level: ${level}`;
        restartBtn.textContent = (getLocale() === "zh-HK" || getLocale() === "zh-Hant") ? "下一關" : "Next level";
      }
    } else {
      const first = selectedCard;
      const second = clicked;
      isFlippingBack = true;
      selectedCard = null;
      setTimeout(() => {
        first.selected = false;
        second.selected = false;
        isFlippingBack = false;
      }, 700);
    }
  }
});

function gameLoop(timestamp) {
  if (gameState !== "playing") return;
  ctx.fillStyle = "#1a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (phase === "peek") {
    const now = timestamp || performance.now();
    if (lastPeekTick === 0) lastPeekTick = now;
    const dt = (now - lastPeekTick) / 1000;
    lastPeekTick = now;
    peekTimeLeft -= dt;
    if (peekTimeLeft <= 0) {
      phase = "playing";
      peekTimeLeft = 0;
    }
    cards.forEach((c) => c.draw(true));
    const countdownNum = Math.max(0, Math.ceil(peekTimeLeft));
    if (countdownNum > 0) {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(countdownNum), canvas.width / 2, 28);
    }
  } else {
    cards.forEach((c) => {
      if (c.matched) c.fadeOut();
      c.draw(c.selected || c.matched);
    });
  }

  animationFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
  gameState = "playing";
  score = 0;
  matches = 0;
  level = 1;
  selectedCard = null;
  phase = "peek";
  peekTimeLeft = PEEK_DURATION;
  lastPeekTick = 0;
  isFlippingBack = false;
  scoreEl.textContent = score;
  matchesEl.textContent = matches;
  levelEl.textContent = level;
  gameOver.classList.add("hidden");
  startBtn.style.display = "none";
  generateCards();
  gameLoop(0);
}

restartBtn.addEventListener("click", () => {
  if (level > 12) {
    startBtn.style.display = "block";
    gameOver.querySelector("h2").textContent = (getLocale() === "zh-HK" || getLocale() === "zh-Hant") ? "全部完成！" : "All done!";
    restartBtn.textContent = (getLocale() === "zh-HK" || getLocale() === "zh-Hant") ? "再玩一次" : "Play again";
    level = 1;
    startGame();
    return;
  }
  gameOver.classList.add("hidden");
  phase = "peek";
  peekTimeLeft = PEEK_DURATION;
  lastPeekTick = 0;
  isFlippingBack = false;
  generateCards();
  gameLoop(0);
});

startBtn.addEventListener("click", startGame);

function drawInitialScreen() {
  ctx.fillStyle = "#1a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d4af37";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  const locale = getLocale();
  ctx.fillText(
    (locale === "zh-HK" || locale === "zh-Hant") ? "點擊「開始遊戲」來開始！" : "Click 'Start Game' to begin!",
    canvas.width / 2,
    canvas.height / 2
  );
}

drawInitialScreen();
document.addEventListener("localeChange", () => {
  if (gameState === "waiting") drawInitialScreen();
});
