// Zodiac Memory Game – match pairs of 12 zodiac animals
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
let phase = "idle"; // "peek" = countdown with cards open, "playing" = cards closed, try to match
let peekTimeLeft = 3;
let lastPeekTick = 0;
const PEEK_DURATION = 3;
let isFlippingBack = false; // block clicks while wrong pair is closing

const ZODIAC = [
  { emoji: "🐀", name: "Rat", nameZh: "鼠" },
  { emoji: "🐂", name: "Ox", nameZh: "牛" },
  { emoji: "🐅", name: "Tiger", nameZh: "虎" },
  { emoji: "🐇", name: "Rabbit", nameZh: "兔" },
  { emoji: "🐉", name: "Dragon", nameZh: "龍" },
  { emoji: "🐍", name: "Snake", nameZh: "蛇" },
  { emoji: "🐎", name: "Horse", nameZh: "馬" },
  { emoji: "🐑", name: "Sheep", nameZh: "羊" },
  { emoji: "🐒", name: "Monkey", nameZh: "猴" },
  { emoji: "🐓", name: "Rooster", nameZh: "雞" },
  { emoji: "🐕", name: "Dog", nameZh: "狗" },
  { emoji: "🐷", name: "Pig", nameZh: "豬" },
];

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

class ZodiacCard {
  constructor(x, y, item, id) {
    this.x = x;
    this.y = y;
    this.item = item;
    this.id = id;
    this.size = 44;
    this.selected = false;
    this.matched = false;
    this.alpha = 1;
  }

  draw(showFace) {
    if (this.matched) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    const r = 8;
    const w = this.size * 2;
    const h = this.size * 2;
    const left = this.x - this.size;
    const top = this.y - this.size;
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
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(this.item.emoji, this.x, this.y);
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
  const items = ZODIAC.slice(0, numPairs);
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
    cards.push(new ZodiacCard(x, y, pairs[i], id++));
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
        restartBtn.textContent = (locale === "zh-HK" || locale === "zh-Hant") ? "下一關" : "Next level";
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
    if (lastPeekTick === 0) lastPeekTick = timestamp || performance.now();
    const now = timestamp || performance.now();
    const dt = (now - lastPeekTick) / 1000;
    lastPeekTick = now;
    peekTimeLeft -= dt;
    if (peekTimeLeft <= 0) {
      phase = "playing";
      peekTimeLeft = 0;
    }
    const showFace = true;
    const countdownNum = Math.max(0, Math.ceil(peekTimeLeft));
    cards.forEach((c) => {
      c.draw(showFace);
    });
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (countdownNum > 0) {
      ctx.fillStyle = "#d4af37";
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
