const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
// Main next canvas is now just the first one, but we might generate more dynamically or use one tall canvas
// Let's use a container logic or multiple canvases.
// Simpler: Use one tall canvas for 'next' or generate canvases in JS?
// The user asked for 5 previews.
// Let's modify index.html to not have a single hardcoded canvas but a container?
// Actually, I already modified index.html to have a #next-queue container.
// So 'nextCanvas' logic needs to change.
const nextQueueContainer = document.getElementById("next-queue");
const holdCanvas = document.getElementById("hold");
const holdContext = holdCanvas.getContext("2d");

context.scale(20, 20);
holdContext.scale(20, 20);

const btn = document.getElementById("startBtn");
const matrixBtn = document.getElementById("matrixBtn");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isGameOver = false;
let isPaused = false;
let isMatrixMode = false;

const arena = createMatrix(12, 20);

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  nextQueue: [], // Array of matrices
  hold: null,
  canHold: true,
  score: 0,
  level: 1,
  lines: 0,
};

const colors = [
  null,
  "#FF0D72",
  "#0DC2FF",
  "#0DFF72",
  "#F538FF",
  "#FF8E0D",
  "#FFE138",
  "#3877FF",
];

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount * 10;
    player.lines++;
    rowCount *= 2;

    // Level up every 10 lines
    if (player.lines % 10 === 0) {
      player.level++;
      dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
    }
  }
  updateScore();
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  if (type === "I") {
    return [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ];
  } else if (type === "L") {
    return [
      [0, 2, 0],
      [0, 2, 0],
      [0, 2, 2],
    ];
  } else if (type === "J") {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [3, 3, 0],
    ];
  } else if (type === "O") {
    return [
      [4, 4],
      [4, 4],
    ];
  } else if (type === "Z") {
    return [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ];
  } else if (type === "S") {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === "T") {
    return [
      [0, 7, 0],
      [7, 7, 7],
      [0, 0, 0],
    ];
  }
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!isMatrixMode) {
    drawGrid();
  }

  drawMatrix(arena, { x: 0, y: 0 });

  // Draw Ghost Piece (Landing Preview)
  drawGhostPiece();

  drawMatrix(player.matrix, player.pos);

  // Draw Next Queue
  updateNextQueueUI();

  // Draw Hold Piece
  drawPreview(holdContext, player.hold);
}

function updateNextQueueUI() {
  nextQueueContainer.innerHTML = "";
  const previewCount = 5;
  player.nextQueue.slice(0, previewCount).forEach((matrix, index) => {
    const canvas = document.createElement("canvas");
    // Make pieces smaller and tighter
    const size = index === 0 ? 80 : 60; // First one slightly bigger
    canvas.width = size;
    canvas.height = size;
    canvas.style.marginBottom = "-10px"; // Negative margin to reduce gap

    const ctx = canvas.getContext("2d");
    const scale = size / 5; // 5 blocks wide grid (standard pieces are max 4, but we center in 5)
    ctx.scale(scale, scale);

    drawPreview(ctx, matrix);
    nextQueueContainer.appendChild(canvas);
  });
}

function drawGhostPiece() {
  if (isGameOver || isPaused) return;

  // Clone player position to calculate drop position
  const ghostPos = { x: player.pos.x, y: player.pos.y };

  // Move ghost down until collision
  while (!collide(arena, { matrix: player.matrix, pos: ghostPos })) {
    ghostPos.y++;
  }
  ghostPos.y--; // Step back up one block

  // Draw ghost piece with transparency
  drawMatrix(player.matrix, ghostPos, context, true);
}

function drawPreview(ctx, matrix) {
  // Clear the canvas with transparency (logical size is always 5x5)
  ctx.clearRect(0, 0, 5, 5);

  if (!matrix) return;

  const matrixWidth = matrix[0].length;
  const matrixHeight = matrix.length;
  const offsetX = (5 - matrixWidth) / 2;
  const offsetY = (5 - matrixHeight) / 2;

  drawMatrix(matrix, { x: offsetX, y: offsetY }, ctx);
}

function drawGrid() {
  context.strokeStyle = "#333";
  context.lineWidth = 0.05;
  context.beginPath();
  // Vertical lines
  for (let x = 0; x <= 12; x++) {
    context.moveTo(x, 0);
    context.lineTo(x, 20);
  }
  // Horizontal lines
  for (let y = 0; y <= 20; y++) {
    context.moveTo(0, y);
    context.lineTo(12, y);
  }
  context.stroke();
}

function drawMatrix(matrix, offset, ctx = context, isGhost = false) {
  if (isMatrixMode) {
    ctx.font = "1px monospace"; // Since we scaled by 20, 1px is actually 20px
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (isMatrixMode) {
        // In matrix mode, we render numbers
        // For the arena (background), we also want to see 0s to visualize the matrix
        // But drawMatrix is generic.
        // If it's the arena (large matrix), we might want to show 0s.
        // If it's a piece (small matrix), showing 0s might overlap the arena 0s?
        // Let's just show values if they are non-zero OR if it's the arena.
        // Actually, to keep it simple:
        // If value is 0, draw it in dark gray.
        // If value is !0, draw it in color.
        // BUT: player piece has 0s that represent transparency. We shouldn't draw those 0s.
        // We can assume if the matrix is `arena`, we draw 0s?
        // It's hard to pass that context.
        // Let's just draw non-zero values as numbers for pieces.
        // For the arena, we can do a separate pass or just rely on the fact that
        // we clear the canvas every frame.
        // If we want to see the "Matrix" of the board, we should iterate the whole board
        // and draw 0s where it's empty.
        // However, drawMatrix iterates the matrix passed in.

        if (value !== 0) {
          ctx.fillStyle = isGhost ? "rgba(255, 255, 255, 0.2)" : colors[value];
          ctx.fillText(value, x + offset.x + 0.5, y + offset.y + 0.5);
        } else if (matrix === arena) {
          // Only draw 0s for the main arena matrix
          ctx.fillStyle = "#333";
          ctx.fillText("0", x + offset.x + 0.5, y + offset.y + 0.5);
        }
      } else {
        if (value !== 0) {
          ctx.fillStyle = isGhost ? "rgba(255, 255, 255, 0.2)" : colors[value];
          ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

          if (isGhost) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 0.05;
            ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            return; // Skip bevel effects for ghost
          }

          // Grid effect for blocks
          ctx.lineWidth = 0.05;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);

          // Add a lighter bevel effect on top-left for 3D look
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(x + offset.x, y + offset.y, 1, 0.1);
          ctx.fillRect(x + offset.x, y + offset.y, 0.1, 1);
        }
      }
    });
  });
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerHardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  playerReset();
  arenaSweep();
  updateScore();
  dropCounter = 0;
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const pieces = "ILJOTSZ";

  // Fill queue if empty (start of game)
  if (player.nextQueue.length === 0) {
    while (player.nextQueue.length < 5) {
      player.nextQueue.push(
        createPiece(pieces[(pieces.length * Math.random()) | 0])
      );
    }
  }

  player.matrix = player.nextQueue.shift();
  player.nextQueue.push(
    createPiece(pieces[(pieces.length * Math.random()) | 0])
  );

  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  player.canHold = true;

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    player.hold = null;
    player.nextQueue = []; // Clear queue on game over
    dropInterval = 1000;
    updateScore();
    isGameOver = true;
    btn.textContent =
      document.documentElement.lang === "zh-Hant" ? "重新開始" : "Restart";
    btn.style.display = "block";
  }
}

function playerHold() {
  if (!player.canHold) return;

  const nextHold = player.matrix;

  // Reset position for the held piece
  // Rotate back to default orientation?
  // Simple way: re-create the piece based on type, but we don't store type.
  // We can just swap matrices. The user might have rotated it.
  // Standard Tetris resets orientation.
  // To do that, we'd need to know the 'type' of the piece.
  // But since we don't track type, we'll just swap the current matrix.
  // This means if you rotated it, it stays rotated.
  // Strictly speaking, standard Tetris resets rotation.
  // Let's try to detect type or just reset rotation if we can?
  // Actually, `playerReset` creates a fresh piece.
  // Let's store the type in the matrix or player?
  // Easier: just swap for now. If rotated, so be it.
  // ACTUALLY: `createPiece` is deterministic based on type.
  // If I want standard behavior, I need to know the type.
  // Let's infer type from matrix size/sum?
  // Or just swap matrices. Swapping is acceptable for a basic implementation.

  if (player.hold === null) {
    player.hold = player.matrix;
    playerReset(); // This spawns next piece
    // playerReset also sets canHold=true, we need to override that
    player.canHold = false;
    // But playerReset spawns from 'next', which is correct.
  } else {
    const temp = player.matrix;
    player.matrix = player.hold;
    player.hold = temp;

    player.pos.y = 0;
    player.pos.x =
      ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    player.canHold = false;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

// Keyboard state
const keys = {
  37: {
    pressed: false,
    handler: () => playerMove(-1),
    lastTime: 0,
    startTime: 0,
  }, // Left
  39: {
    pressed: false,
    handler: () => playerMove(1),
    lastTime: 0,
    startTime: 0,
  }, // Right
  40: {
    pressed: false,
    handler: () => playerDrop(),
    lastTime: 0,
    startTime: 0,
  }, // Down
};
const keyRepeatDelay = 150;
const keyRepeatRate = 50;

function handleKeyInput(time) {
  Object.keys(keys).forEach((keyCode) => {
    const key = keys[keyCode];
    if (key.pressed) {
      if (time - key.startTime > keyRepeatDelay) {
        if (time - key.lastTime > keyRepeatRate) {
          key.handler();
          key.lastTime = time;
        }
      }
    }
  });
}

function update(time = 0) {
  if (isGameOver || isPaused) return;

  handleKeyInput(time);

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  const lang = document.documentElement.lang;
  scoreElement.innerText =
    lang === "zh-Hant" ? `分數: ${player.score}` : `Score: ${player.score}`;
  levelElement.innerText =
    lang === "zh-Hant" ? `等級: ${player.level}` : `Level: ${player.level}`;
}

document.addEventListener("keydown", (event) => {
  if (isGameOver) return;

  if (keys[event.keyCode]) {
    if (!keys[event.keyCode].pressed) {
      keys[event.keyCode].pressed = true;
      keys[event.keyCode].startTime = performance.now();
      keys[event.keyCode].lastTime = performance.now();
      keys[event.keyCode].handler(); // Trigger immediately
    }
    return;
  }

  if (event.keyCode === 81) {
    // Q
    playerRotate(-1);
  } else if (event.keyCode === 87 || event.keyCode === 38) {
    // W or Up
    playerRotate(1);
  } else if (event.keyCode === 32) {
    // Space
    playerHardDrop();
  } else if (event.keyCode === 67 || event.keyCode === 16) {
    // C or Shift
    playerHold();
  }
});

document.addEventListener("keyup", (event) => {
  if (keys[event.keyCode]) {
    keys[event.keyCode].pressed = false;
  }
});

matrixBtn.addEventListener("click", () => {
  isMatrixMode = !isMatrixMode;
  draw();
  btn.blur(); // Remove focus so space bar doesn't trigger button
  matrixBtn.blur();
});

// Mobile Gesture Controls
const setupGestureControls = () => {
  const el = document.getElementById("tetris"); // Touch on canvas
  let touchstartX = 0;
  let touchstartY = 0;
  let touchstartTime = 0;
  let lastMoveX = 0;
  let moveThreshold = 30; // Distance to move 1 block

  el.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault(); // Prevent scrolling
      touchstartX = e.changedTouches[0].screenX;
      touchstartY = e.changedTouches[0].screenY;
      touchstartTime = new Date().getTime();
      lastMoveX = touchstartX;
    },
    { passive: false }
  );

  el.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (isGameOver || isPaused) return;

      const currentX = e.changedTouches[0].screenX;
      const diffX = currentX - lastMoveX;

      // Continuous Horizontal Movement
      if (Math.abs(diffX) > moveThreshold) {
        const direction = diffX > 0 ? 1 : -1;
        // Calculate how many steps to move based on distance
        const steps = Math.floor(Math.abs(diffX) / moveThreshold);

        for (let i = 0; i < steps; i++) {
          playerMove(direction);
        }

        // Update lastMoveX to be the point after moving steps * threshold
        // This avoids "losing" distance if moving fast
        lastMoveX += direction * steps * moveThreshold;
      }
    },
    { passive: false }
  );

  el.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const touchendX = e.changedTouches[0].screenX;
      const touchendY = e.changedTouches[0].screenY;
      const touchendTime = new Date().getTime();

      handleGesture(
        touchstartX,
        touchstartY,
        touchendX,
        touchendY,
        touchendTime - touchstartTime
      );
    },
    { passive: false }
  );

  const handleGesture = (startX, startY, endX, endY, duration) => {
    if (isGameOver || isPaused) return;

    const diffX = endX - startX;
    const diffY = endY - startY;

    // Thresholds
    const minSwipeDistance = 30;
    const tapThreshold = 10;

    // Tap: Rotate
    // Only if not much movement happened (both X and Y)
    if (
      Math.abs(diffX) < tapThreshold &&
      Math.abs(diffY) < tapThreshold &&
      duration < 300
    ) {
      playerRotate(1);
      return;
    }

    // Vertical swipes (Hold/Drop)
    // Prioritize vertical swipe if Y distance is significant and clearly vertical dominant
    if (
      Math.abs(diffY) > Math.abs(diffX) &&
      Math.abs(diffY) > minSwipeDistance
    ) {
      if (diffY > 0) {
        // Swipe down: Hard Drop
        playerHardDrop();
      } else {
        // Swipe up: Hold
        playerHold();
      }
    }
    // Horizontal movement is handled by touchmove now
  };
};

setupGestureControls();

btn.addEventListener("click", () => {
  if (isGameOver) {
    isGameOver = false;
    isPaused = false;
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    player.hold = null;
    player.nextQueue = []; // Clear queue to force refill
    dropInterval = 1000;
    playerReset();
    updateScore();
    update();
    btn.style.display = "none";
  } else {
    // Start fresh if clicked for the first time
    if (!player.matrix) {
      playerReset();
      update();
      btn.style.display = "none";
    }
  }
});
