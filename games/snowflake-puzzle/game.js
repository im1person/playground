// Snowflake Puzzle Game

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const scoreEl = document.getElementById("score");
const matchesEl = document.getElementById("matches");
const levelEl = document.getElementById("level");

// Set canvas size
canvas.width = 800;
canvas.height = 600;

let gameState = "waiting"; // waiting, playing, gameover
let score = 0;
let matches = 0;
let level = 1;
let snowflakes = [];
let selectedSnowflake = null;
let animationFrame = null;

// Snowflake patterns (different shapes)
const patterns = ["❄", "❅", "❆", "✻", "✼", "✽"];

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Snowflake class
class Snowflake {
  constructor(x, y, pattern, id) {
    this.x = x;
    this.y = y;
    this.pattern = pattern;
    this.id = id;
    this.size = 40;
    this.selected = false;
    this.matched = false;
    this.alpha = 1;
  }

  draw() {
    if (this.matched) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.selected) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.selected ? "#ffd700" : "#fff";
    ctx.fillText(this.pattern, this.x, this.y);

    ctx.restore();
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy <= this.size * this.size;
  }

  fadeOut() {
    this.alpha -= 0.05;
    if (this.alpha <= 0) {
      this.matched = true;
    }
  }
}

// Generate snowflakes for a level
function generateSnowflakes() {
  snowflakes = [];
  const numPairs = 3 + level; // More pairs as level increases
  const patternsToUse = patterns.slice(0, Math.min(numPairs, patterns.length));

  // Create pairs
  const pairs = [];
  patternsToUse.forEach((pattern) => {
    pairs.push(pattern);
    pairs.push(pattern);
  });

  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  // Position snowflakes in a grid
  const cols = 6;
  const rows = Math.ceil(pairs.length / cols);
  const spacingX = canvas.width / (cols + 1);
  const spacingY = canvas.height / (rows + 1);
  let id = 0;

  for (let i = 0; i < pairs.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = spacingX * (col + 1);
    const y = spacingY * (row + 1) + 50; // Offset from top
    snowflakes.push(new Snowflake(x, y, pairs[i], id++));
  }
}

// Handle click
canvas.addEventListener("click", (e) => {
  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Find clicked snowflake
  const clicked = snowflakes.find((s) => !s.matched && s.contains(x, y));

  if (!clicked) return;

  if (!selectedSnowflake) {
    // First selection
    selectedSnowflake = clicked;
    clicked.selected = true;
  } else if (selectedSnowflake === clicked) {
    // Deselect
    clicked.selected = false;
    selectedSnowflake = null;
  } else {
    // Second selection - check for match
    if (selectedSnowflake.pattern === clicked.pattern) {
      // Match!
      selectedSnowflake.matched = true;
      clicked.matched = true;
      matches++;
      score += 10 * level;
      matchesEl.textContent = matches;
      scoreEl.textContent = score;

      // Check if level complete
      const allMatched = snowflakes.every((s) => s.matched);
      if (allMatched) {
        level++;
        levelEl.textContent = level;
        setTimeout(() => {
          generateSnowflakes();
        }, 1000);
      }
    } else {
      // No match - deselect
      selectedSnowflake.selected = false;
    }
    selectedSnowflake = null;
  }
});

// Game loop
function gameLoop() {
  if (gameState !== "playing") return;

  // Clear canvas
  ctx.fillStyle = "#1a237e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw snowflakes
  snowflakes.forEach((snowflake) => {
    if (snowflake.matched) {
      snowflake.fadeOut();
    }
    snowflake.draw();
  });

  // Check game over (all matched)
  const allMatched = snowflakes.every((s) => s.matched);
  if (allMatched && snowflakes.length > 0) {
    // Level complete, will generate new level
  }

  animationFrame = requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
  gameState = "playing";
  score = 0;
  matches = 0;
  level = 1;
  selectedSnowflake = null;
  scoreEl.textContent = score;
  matchesEl.textContent = matches;
  levelEl.textContent = level;
  gameOver.classList.add("hidden");
  startBtn.style.display = "none";

  generateSnowflakes();
  gameLoop();
}

// Game over
function endGame() {
  gameState = "gameover";
  cancelAnimationFrame(animationFrame);
  const locale = getLocale();
  finalScore.textContent =
    locale === "zh-Hant"
      ? `最終分數: ${score} | 配對: ${matches} | 等級: ${level}`
      : `Final Score: ${score} | Matches: ${matches} | Level: ${level}`;
  gameOver.classList.remove("hidden");
  startBtn.style.display = "block";
}

// Event listeners
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// Initial draw
function drawInitialScreen() {
  ctx.fillStyle = "#1a237e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  const locale = getLocale();
  const message =
    locale === "zh-Hant"
      ? "點擊「開始遊戲」來開始！"
      : "Click 'Start Game' to begin!";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// Initial draw
drawInitialScreen();

// Listen for locale changes to redraw initial screen
document.addEventListener("localeChange", () => {
  if (gameState === "waiting") {
    drawInitialScreen();
  }
});
