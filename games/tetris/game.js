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
const autoBtn = document.getElementById("autoBtn");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isGameOver = false;
let isPaused = false;
let isMatrixMode = false;
let isAutoSolver = false;
let autoSolverSpeed = 50; // Speed in milliseconds (default 50ms)

// AI movement state - tracks incremental movement to target
let aiMovementState = {
  active: false,
  targetMove: null,
  rotationsNeeded: 0,
  rotationsDone: 0,
  targetX: 0,
};

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

// Row clearing animation state
let rowClearAnimation = {
  active: false,
  rowsToClear: [], // Array of row indices to clear
  progress: 0, // 0 to 1
  duration: 150, // milliseconds (faster animation)
  startTime: 0,
  particles: [], // Particle effects
  flashIntensity: 0, // Flash effect intensity
};

function arenaSweep() {
  // If animation is already active, don't start a new one
  if (rowClearAnimation.active) {
    return;
  }

  let rowCount = 1;
  const rowsToClear = [];
  let linesCleared = 0;

  // Find all full rows
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    rowsToClear.push(y);
    linesCleared++;
  }

  // If no rows to clear, return early
  if (rowsToClear.length === 0) {
    return;
  }

  // Start animation if rows need to be cleared
  if (rowsToClear.length > 0) {
    rowClearAnimation.active = true;
    rowClearAnimation.rowsToClear = rowsToClear;
    rowClearAnimation.progress = 0;
    rowClearAnimation.startTime = performance.now();
    rowClearAnimation.flashIntensity = 1.0;
    // Generate particles for visual effect
    rowClearAnimation.particles = generateRowClearParticles(rowsToClear);
  }

  // Calculate score immediately (before animation completes)
  let score = 0;
  for (let i = 0; i < linesCleared; i++) {
    score += rowCount * 10;
    rowCount *= 2;
  }

  player.score += score;
  player.lines += linesCleared;

  // Level up every 10 lines
  if (player.lines % 10 === 0) {
    player.level++;
    dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
  }

  updateScore();
}

function updateRowClearAnimation(time) {
  if (!rowClearAnimation.active) return;

  const elapsed = time - rowClearAnimation.startTime;
  rowClearAnimation.progress = Math.min(
    elapsed / rowClearAnimation.duration,
    1
  );

  // Update flash intensity (peaks at start, fades out)
  rowClearAnimation.flashIntensity = Math.max(
    0,
    1 - rowClearAnimation.progress * 2
  );

  // Update particles
  rowClearAnimation.particles = rowClearAnimation.particles.filter(
    (particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life -= 0.02;
      particle.alpha = particle.life;
      return particle.life > 0;
    }
  );

  // When animation completes, actually remove the rows
  if (rowClearAnimation.progress >= 1) {
    // Sort rows from bottom to top to avoid index shifting issues
    const rowsToClear = [...rowClearAnimation.rowsToClear].sort(
      (a, b) => b - a
    );

    // Remove each row and add empty row at top
    rowsToClear.forEach((y) => {
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
    });

    rowClearAnimation.active = false;
    rowClearAnimation.rowsToClear = [];
    rowClearAnimation.progress = 0;
    rowClearAnimation.particles = [];
    rowClearAnimation.flashIntensity = 0;
  }
}

// Generate particles for row clear effect
function generateRowClearParticles(rowsToClear) {
  const particles = [];
  rowsToClear.forEach((y) => {
    // Generate particles for each block in the cleared row
    for (let x = 0; x < arena[0].length; x++) {
      if (arena[y] && arena[y][x] !== 0) {
        const color = colors[arena[y][x]];
        // Create 3-5 particles per block
        const particleCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: x + 0.5 + (Math.random() - 0.5) * 0.5,
            y: y + 0.5 + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.5 - Math.random() * 0.5,
            color: color,
            size: 0.1 + Math.random() * 0.15,
            life: 1.0,
            alpha: 1.0,
          });
        }
      }
    }
  });
  return particles;
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

  // Draw arena with animation offsets if animation is active
  if (rowClearAnimation.active) {
    drawArenaWithAnimation();
  } else {
    drawMatrix(arena, { x: 0, y: 0 });
  }

  // Draw Ghost Piece (Landing Preview)
  drawGhostPiece();

  drawMatrix(player.matrix, player.pos);

  // Draw Next Queue
  updateNextQueueUI();

  // Draw Hold Piece
  drawPreview(holdContext, player.hold);
}

function drawArenaWithAnimation() {
  const { rowsToClear, progress, particles, flashIntensity } =
    rowClearAnimation;
  const rowsToClearSet = new Set(rowsToClear);

  // Use easing function for smooth animation (ease-out)
  const easedProgress = 1 - Math.pow(1 - progress, 3);

  // Draw flash effect overlay
  if (flashIntensity > 0) {
    context.save();
    context.globalAlpha = flashIntensity * 0.3;
    context.fillStyle = "#ffffff";
    rowsToClear.forEach((y) => {
      context.fillRect(0, y, arena[0].length, 1);
    });
    context.restore();
  }

  arena.forEach((row, y) => {
    if (rowsToClearSet.has(y)) {
      // Draw rows being cleared with fade-out and glow effect
      const alpha = 1 - easedProgress;
      if (alpha > 0) {
        context.save();

        // Add glow effect
        if (alpha > 0.5) {
          context.shadowBlur = 10;
          context.shadowColor = "#ffffff";
        }

        context.globalAlpha = alpha;
        drawMatrixRow(row, { x: 0, y: y });
        context.restore();
      }
    } else {
      // Calculate how many cleared rows are below (higher y index) this row
      let dropOffset = 0;
      for (const clearY of rowsToClear) {
        if (clearY > y) {
          dropOffset++;
        }
      }

      // Draw row with drop offset (rows drop down, so y increases)
      if (dropOffset > 0) {
        const offsetY = y + dropOffset * easedProgress;
        drawMatrixRow(row, { x: 0, y: offsetY });
      } else {
        drawMatrixRow(row, { x: 0, y: y });
      }
    }
  });

  // Draw particles
  context.save();
  particles.forEach((particle) => {
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();

    // Add sparkle effect for some particles
    if (Math.random() > 0.7) {
      context.fillStyle = "#ffffff";
      context.globalAlpha = particle.alpha * 0.8;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.restore();
}

function drawMatrixRow(row, offset) {
  if (isMatrixMode) {
    context.font = "1px monospace"; // Since we scaled by 20, 1px is actually 20px
    context.textAlign = "center";
    context.textBaseline = "middle";
  }

  row.forEach((value, x) => {
    if (value !== 0) {
      if (isMatrixMode) {
        context.fillStyle = colors[value];
        context.fillText(value, x + offset.x + 0.5, offset.y + 0.5);
      } else {
        const blockColor = colors[value];
        context.fillStyle = blockColor;
        context.fillRect(x + offset.x, offset.y, 1, 1);

        // Grid effect for blocks
        context.lineWidth = 0.05;
        context.strokeStyle = "rgba(0, 0, 0, 0.3)";
        context.strokeRect(x + offset.x, offset.y, 1, 1);

        // Add a lighter bevel effect on top-left for 3D look
        context.fillStyle = "rgba(255, 255, 255, 0.3)";
        context.fillRect(x + offset.x, offset.y, 1, 0.1);
        context.fillRect(x + offset.x, offset.y, 0.1, 1);

        // Restore block color for next iteration
        context.fillStyle = blockColor;
      }
    } else if (isMatrixMode && offset.y >= 0 && offset.y < 20) {
      context.fillStyle = "#333";
      context.fillText("0", x + offset.x + 0.5, offset.y + 0.5);
    }
  });
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
      (document.documentElement.lang === "zh-HK" || document.documentElement.(lang === "zh-HK" || lang === "zh-Hant")) ? "重新開始" : "Restart";
    btn.style.display = "block";
  }
}

function playerHold() {
  if (!player.canHold) return;

  if (player.hold === null) {
    player.hold = player.matrix;
    playerReset(); // This spawns next piece
    player.canHold = false;
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

// AI / Auto Solver Logic
function aiStep() {
  if (isGameOver || isPaused) return;

  // Evaluate current piece
  const currentMove = getBestMove(arena, player, player.matrix);

  // Check if holding gives a better move
  // To check hold, we need to know what piece we would get.
  let holdMove = null;
  let matrixIfHold = null;

  if (player.canHold) {
    if (player.hold) {
      matrixIfHold = player.hold;
    } else {
      // If hold is empty, holding pulls the NEXT piece from queue.
      // We can peek at nextQueue[0]
      matrixIfHold = player.nextQueue[0];
    }

    holdMove = getBestMove(arena, player, matrixIfHold);
  }

  // Compare moves
  let bestMove = currentMove;
  let shouldUseHold = false;

  if (
    holdMove &&
    holdMove.score > (currentMove ? currentMove.score : -Infinity)
  ) {
    bestMove = holdMove;
    shouldUseHold = true;
  }

  if (bestMove) {
    if (shouldUseHold) {
      playerHold();
    }

    // Set up incremental movement to target
    setupAIMovement(bestMove);
  } else {
    // No valid moves? Just drop.
    playerDrop();
  }
}

// Set up AI movement state for incremental movement
function setupAIMovement(targetMove) {
  const targetMatrix = targetMove.matrix;
  let rotationsNeeded = 0;
  let testMatrix = player.matrix.map((row) => [...row]);

  // Find how many rotations are needed
  for (let r = 0; r < 4; r++) {
    if (matricesMatch(testMatrix, targetMatrix)) {
      rotationsNeeded = r;
      break;
    }
    rotate(testMatrix, 1);
  }

  // Set up movement state
  aiMovementState.active = true;
  aiMovementState.targetMove = targetMove;
  aiMovementState.rotationsNeeded = rotationsNeeded;
  aiMovementState.rotationsDone = 0;
  aiMovementState.targetX = targetMove.x;
}

// Execute one step of AI movement (called each frame)
function executeAIMovementStep() {
  if (!aiMovementState.active) return false;

  // First, handle rotations
  if (aiMovementState.rotationsDone < aiMovementState.rotationsNeeded) {
    playerRotate(1);
    aiMovementState.rotationsDone++;
    return true; // Still moving
  }

  // Then, handle horizontal movement
  const currentX = player.pos.x;
  const targetX = aiMovementState.targetX;

  if (currentX < targetX) {
    playerMove(1);
    return true; // Still moving
  } else if (currentX > targetX) {
    playerMove(-1);
    return true; // Still moving
  }

  // We've reached the target position - hard drop and reset
  playerHardDrop();
  aiMovementState.active = false;
  aiMovementState.targetMove = null;
  return false; // Movement complete
}

// Helper function to check if two matrices match
function matricesMatch(matrix1, matrix2) {
  if (matrix1.length !== matrix2.length) return false;
  for (let y = 0; y < matrix1.length; y++) {
    if (matrix1[y].length !== matrix2[y].length) return false;
    for (let x = 0; x < matrix1[y].length; x++) {
      if (matrix1[y][x] !== matrix2[y][x]) return false;
    }
  }
  return true;
}

function getBestMove(arena, player, pieceMatrix) {
  let bestScore = -Infinity;
  let bestMove = null;

  // Iterate rotations (0 to 3)
  let currentMatrix = pieceMatrix.map((row) => [...row]);

  for (let r = 0; r < 4; r++) {
    // Iterate all columns
    for (let x = -5; x < arena[0].length + 2; x++) {
      // Create a test player state
      // Note: We must ensure x is valid for the collision check initially (at top)
      // But the piece might be wide.

      const testPlayer = {
        matrix: currentMatrix,
        pos: { x: x, y: player.pos.y }, // Start at current Y (usually 0)
      };

      // If immediate collision at spawn Y, skip
      if (collide(arena, testPlayer)) continue;

      // Drop it to find landing position
      while (!collide(arena, testPlayer)) {
        testPlayer.pos.y++;
      }
      testPlayer.pos.y--; // Back up one

      // Evaluate board state
      const score = evaluateBoard(arena, testPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestMove = {
          matrix: currentMatrix.map((row) => [...row]),
          x: x,
          y: testPlayer.pos.y,
          score: score,
        };
      }
    }
    rotate(currentMatrix, 1);
  }

  return bestMove;
}

function evaluateBoard(arena, player) {
  // Clone grid to simulate placement
  const grid = arena.map((row) => [...row]);

  // Merge player into grid
  // Note: player.pos.y is the landing position
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        if (
          grid[y + player.pos.y] &&
          grid[y + player.pos.y][x + player.pos.x] !== undefined
        ) {
          grid[y + player.pos.y][x + player.pos.x] = value;
        }
      }
    });
  });

  // Heuristics
  let aggregateHeight = 0;
  let completeLines = 0;
  let holes = 0;
  let bumpiness = 0;

  const heights = new Array(grid[0].length).fill(0);

  // 1. Column Heights & Holes
  for (let x = 0; x < grid[0].length; x++) {
    let colHeight = 0;
    let foundTop = false;
    for (let y = 0; y < grid.length; y++) {
      if (grid[y][x] !== 0) {
        if (!foundTop) {
          colHeight = grid.length - y;
          foundTop = true;
        }
      } else if (foundTop) {
        // If we found top already, and this is 0, it's a hole
        holes++;
      }
    }
    heights[x] = colHeight;
    aggregateHeight += colHeight;
  }

  // 2. Complete Lines
  for (let y = 0; y < grid.length; y++) {
    let isRowFull = true;
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 0) {
        isRowFull = false;
        break;
      }
    }
    if (isRowFull) completeLines++;
  }

  // 3. Bumpiness
  for (let x = 0; x < heights.length - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  // Weights
  const a = -0.51;
  const b = 0.76;
  const c = -0.36;
  const d = -0.18;

  return a * aggregateHeight + b * completeLines + c * holes + d * bumpiness;
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
  if (isGameOver || isPaused) {
    // Still update animation even when paused (for visual consistency)
    if (rowClearAnimation.active) {
      updateRowClearAnimation(time);
      draw();
    }
    requestAnimationFrame(update);
    return;
  }

  // Update row clear animation
  updateRowClearAnimation(time);

  // Don't allow piece movement during row clear animation
  if (!rowClearAnimation.active) {
    handleKeyInput(time);

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;

    if (isAutoSolver) {
      // If AI is moving a piece, execute one movement step per frame
      if (aiMovementState.active) {
        executeAIMovementStep();
      } else {
        // If not moving, wait for interval then plan next move
        if (dropCounter > autoSolverSpeed) {
          aiStep();
          dropCounter = 0;
        }
      }
    } else {
      if (dropCounter > dropInterval) {
        playerDrop();
      }
    }
  }

  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  const lang = document.documentElement.lang;
  scoreElement.innerText =
    (lang === "zh-HK" || lang === "zh-Hant") ? `分數: ${player.score}` : `Score: ${player.score}`;
  levelElement.innerText =
    (lang === "zh-HK" || lang === "zh-Hant") ? `等級: ${player.level}` : `Level: ${player.level}`;
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
  btn.blur();
  matrixBtn.blur();
});

// Function to set auto solver speed (called from HTML)
function setAutoSolverSpeed(speed) {
  autoSolverSpeed = Math.max(10, Math.min(1000, speed)); // Clamp between 10 and 1000ms
}

autoBtn.addEventListener("click", () => {
  isAutoSolver = !isAutoSolver;
  autoBtn.style.backgroundColor = isAutoSolver ? "#d32f2f" : "#9c27b0"; // Red when on to signify "Stop" or similar
  autoBtn.innerText = isAutoSolver
    ? (document.documentElement.lang === "zh-HK" || document.documentElement.(lang === "zh-HK" || lang === "zh-Hant"))
      ? "停止自動"
      : "Stop Auto"
    : (document.documentElement.lang === "zh-HK" || document.documentElement.(lang === "zh-HK" || lang === "zh-Hant"))
    ? "自動解題"
    : "Auto Solver";

  // Show/hide speed control
  const speedControl = document.getElementById("speedControl");
  if (speedControl) {
    speedControl.style.display = isAutoSolver ? "block" : "none";
  }

  btn.blur();
  autoBtn.blur();
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
