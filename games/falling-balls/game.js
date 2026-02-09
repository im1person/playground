const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

let balls = [];
let score = 0;
let running = false;

class Ball {
  constructor(x, y, radius, speed, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.color = color;
  }
}

function randomColor() {
  const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Responsive canvas
function resizeCanvas() {
  // Maintain 2:3 aspect ratio (like 400x600)
  const width = Math.min(window.innerWidth - 20, 400);
  const height = width * 1.5;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Update spawnBall to use current canvas size
function spawnBall() {
  const radius = 20 + Math.random() * 15;
  const x = radius + Math.random() * (canvas.width - 2 * radius);
  const y = -radius;
  const speed = 2 + Math.random() * 3;
  const color = randomColor();
  balls.push(new Ball(x, y, radius, speed, color));
}

let spawnInterval;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw balls
  balls.forEach(ball => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
  });
}

function update() {
  // Move balls
  balls.forEach(ball => {
    ball.y += ball.speed;
  });
  // Check for game over: if any ball reaches the bottom
  for (let ball of balls) {
    if (ball.y + ball.radius >= canvas.height) {
      stopGame();
      scoreDiv.textContent = getGameOverText(score);
      startBtn.textContent = getRestartText();
      return;
    }
  }
  // Remove balls that fall off screen (not needed with game over, but keep for safety)
  balls = balls.filter(ball => ball.y - ball.radius < canvas.height);
}

  // Sound effects
function playPopSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 600;
  g.gain.value = 0.1;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.08);
  o.onended = () => ctx.close();
}

function playGameOverSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 200;
  g.gain.value = 0.15;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
  o.stop(ctx.currentTime + 0.4);
  o.onended = () => ctx.close();
}

function gameLoop() {
  if (!running) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  balls = [];
  score = 0;
  running = true;
  scoreDiv.textContent = getScoreText(score);
  startBtn.textContent = getRestartText();
  if (spawnInterval) clearInterval(spawnInterval);
  spawnInterval = setInterval(() => {
    if (running) spawnBall();
  }, 800);
  gameLoop();
}

function stopGame() {
  running = false;
  if (spawnInterval) clearInterval(spawnInterval);
}

function getLocale() {
  return localStorage.getItem('playground-locale') || 'en';
}

function getScoreText(score) {
  return (getLocale() === 'zh-HK' || getLocale() === 'zh-Hant') ? '分數: ' + score : 'Score: ' + score;
}

function getGameOverText(score) {
  return (getLocale() === 'zh-HK' || getLocale() === 'zh-Hant') ? `遊戲結束！最終分數: ${score}` : `Game Over! Final Score: ${score}`;
}

function getRestartText() {
  return (getLocale() === 'zh-HK' || getLocale() === 'zh-Hant') ? '重新開始' : 'Restart Game';
}

startBtn.addEventListener('click', function() {
  if (running) {
    // If game is running, restart
    stopGame();
  }
  startGame();
});
canvas.addEventListener('click', function(event) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  // Find the first ball that contains the click
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    if (dx * dx + dy * dy <= ball.radius * ball.radius) {
      // Remove the ball and update score
      balls.splice(i, 1);
      score++;
      scoreDiv.textContent = 'Score: ' + score;
      playPopSound();
      break;
    }
  }
});

// Touch support for popping balls
canvas.addEventListener('touchstart', function(event) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const mouseX = touch.clientX - rect.left;
  const mouseY = touch.clientY - rect.top;
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const dx = mouseX - ball.x;
    const dy = mouseY - ball.y;
    if (dx * dx + dy * dy <= ball.radius * ball.radius) {
      balls.splice(i, 1);
      score++;
      scoreDiv.textContent = 'Score: ' + score;
      playPopSound();
      break;
    }
  }
}, { passive: false }); 