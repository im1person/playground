const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const nextQueueContainer = document.getElementById("next-queue");
const holdCanvas = document.getElementById("hold");
const holdContext = holdCanvas.getContext("2d");

context.scale(20, 20);
holdContext.scale(20, 20);

const btn = document.getElementById("startBtn");
const matrixBtn = document.getElementById("matrixBtn");
const autoBtn = document.getElementById("autoBtn");
const tspinAutoBtn = document.getElementById("tspinAutoBtn");
const demoSetupBtn = document.getElementById("demoSetupBtn");
const demoDTCannonBtn = document.getElementById("demoDTCannonBtn");
const debugEffectBtn = document.getElementById("debugEffectBtn");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isGameOver = false;
let isPaused = false;
let isMatrixMode = false;
let isAutoSolver = false;
let isTSpinBot = false;
let autoSolverSpeed = 300; // Speed in milliseconds (default 300ms for T-Spin bot, will be adjusted)

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
  type: null, // Track piece type for SRS
  rotation: 0, // 0, 1, 2, 3
  nextQueue: [],
  hold: null,
  holdType: null,
  canHold: true,
  score: 0,
  level: 1,
  lines: 0,
  lastMoveWasRotate: false, // For T-Spin detection
  b2b: false, // Back-to-Back status
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

// Global flag to track T-Spin status for the current lock
let isTSpinLock = false;

// Row clearing animation state
let rowClearAnimation = {
  active: false,
  rowsToClear: [], // Array of row indices to clear
  progress: 0, // 0 to 1
  duration: 300, // milliseconds
  startTime: 0,
};

// Standard Rotation System (SRS) kick tables
const SRS_KICKS = {
  standard: {
    "0>1": [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    "1>0": [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, 2],
      [1, 2],
    ],
    "1>2": [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, 2],
      [1, 2],
    ],
    "2>1": [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    "2>3": [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, -2],
      [1, -2],
    ],
    "3>2": [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
    "3>0": [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
    "0>3": [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, -2],
      [1, -2],
    ],
  },
  I: {
    "0>1": [
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, -1],
      [1, 2],
    ],
    "1>0": [
      [0, 0],
      [2, 0],
      [-1, 0],
      [2, 1],
      [-1, -2],
    ],
    "1>2": [
      [0, 0],
      [-1, 0],
      [2, 0],
      [-1, 2],
      [2, -1],
    ],
    "2>1": [
      [0, 0],
      [1, 0],
      [-2, 0],
      [1, -2],
      [-2, 1],
    ],
    "2>3": [
      [0, 0],
      [2, 0],
      [-1, 0],
      [2, 1],
      [-1, -2],
    ],
    "3>2": [
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, -1],
      [1, 2],
    ],
    "3>0": [
      [0, 0],
      [1, 0],
      [-2, 0],
      [1, -2],
      [-2, 1],
    ],
    "0>3": [
      [0, 0],
      [-1, 0],
      [2, 0],
      [-1, 2],
      [2, -1],
    ],
  },
};

function arenaSweep() {
  // If animation is already active, don't start a new one
  if (rowClearAnimation.active) {
    return;
  }

  let rowCount = 1;
  let linesCleared = 0;
  const rowsToClear = [];

  // Find all full rows
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    rowsToClear.push(y);
    linesCleared++;
    rowCount *= 2;
  }

  // If no rows to clear, proceed with scoring logic only
  if (linesCleared === 0 && !isTSpinLock) {
    isTSpinLock = false;
    return;
  }

  // Start animation if rows need to be cleared
  if (rowsToClear.length > 0) {
    rowClearAnimation.active = true;
    rowClearAnimation.rowsToClear = rowsToClear;
    rowClearAnimation.progress = 0;
    rowClearAnimation.startTime = performance.now();
  }

  // Calculate score immediately (before animation completes)
  if (linesCleared > 0 || isTSpinLock) {
    // Score Calculation
    let score = 0;
    let isB2BClear = false; // Does this clear maintain B2B?

    if (isTSpinLock) {
      // T-Spin Scoring
      // Mini check? Typically requires wall kicks. We'll assume full T-Spin for 3-corner rule.
      // T-Spin No Lines: 400 (Standard guideline often 100 or 400)
      // T-Spin Single: 800
      // T-Spin Double: 1200
      // T-Spin Triple: 1600

      const tSpinScores = [400, 800, 1200, 1600];
      score = tSpinScores[linesCleared];
      isB2BClear = true;

      // Visualize T-Spin
      drawTSpinCorners();
      console.log("T-SPIN " + (linesCleared === 0 ? "Zero" : linesCleared));
    } else {
      // Standard Scoring
      // Single: 100, Double: 300, Triple: 500, Tetris: 800
      const standardScores = [0, 100, 300, 500, 800];
      score = standardScores[linesCleared] || 0;

      // Only Tetris maintains B2B
      if (linesCleared === 4) {
        isB2BClear = true;
      }
    }

    // Back-to-Back Multiplier
    if (isB2BClear) {
      if (player.b2b) {
        score = Math.floor(score * 1.5);
        console.log("Back-to-Back!");
        // TODO: Visual indicator for B2B
      }
      player.b2b = true;
    } else if (linesCleared > 0) {
      // Cleared lines but not T-Spin or Tetris -> Reset B2B
      player.b2b = false;
    }
    // If linesCleared === 0 and isTSpinLock === false, standard lock, no change to B2B

    player.score += score * player.level;
    player.lines += linesCleared;

    // Level up every 10 lines
    if (Math.floor(player.lines / 10) > player.level - 1) {
      player.level++;
      dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
    }
  }

  // Reset T-Spin flag after processing
  isTSpinLock = false;

  updateScore();
}

function updateRowClearAnimation(time) {
  if (!rowClearAnimation.active) return;

  const elapsed = time - rowClearAnimation.startTime;
  rowClearAnimation.progress = Math.min(
    elapsed / rowClearAnimation.duration,
    1
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
  }
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
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
  } else if (type === "L") {
    return [
      [0, 0, 2],
      [2, 2, 2],
      [0, 0, 0],
    ];
  } else if (type === "J") {
    return [
      [3, 0, 0],
      [3, 3, 3],
      [0, 0, 0],
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
  const { rowsToClear, progress } = rowClearAnimation;
  const rowsToClearSet = new Set(rowsToClear);

  // Use easing function for smooth animation (ease-out)
  const easedProgress = 1 - Math.pow(1 - progress, 3);

  arena.forEach((row, y) => {
    if (rowsToClearSet.has(y)) {
      // Draw rows being cleared with fade-out effect
      const alpha = 1 - easedProgress;
      if (alpha > 0) {
        context.save();
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
}

function drawMatrixRow(row, offset) {
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
  player.nextQueue.forEach((item, index) => {
    if (index >= previewCount) return;

    const matrix = createPiece(item); // Queue stores types now
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

function getSRSKicks(type, from, to) {
  if (type === "O") {
    return [[0, 0]];
  }
  const key = `${from}>${to}`;
  if (type === "I") {
    return SRS_KICKS.I[key] || [[0, 0]];
  }
  return SRS_KICKS.standard[key] || [[0, 0]];
}

function playerHardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  checkTSpinOnLock(); // Identify T-Spin before reset
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
    checkTSpinOnLock(); // Identify T-Spin before reset
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
  player.lastMoveWasRotate = false;
}

function playerReset() {
  const pieces = "ILJOTSZ";

  // Fill queue if empty (start of game)
  if (player.nextQueue.length === 0) {
    while (player.nextQueue.length < 5) {
      player.nextQueue.push(pieces[(pieces.length * Math.random()) | 0]);
    }
  }

  player.type = player.nextQueue.shift();
  player.matrix = createPiece(player.type);
  player.nextQueue.push(pieces[(pieces.length * Math.random()) | 0]);
  player.rotation = 0;

  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  player.canHold = true;
  player.lastMoveWasRotate = false;

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    player.hold = null;
    player.holdType = null;
    player.nextQueue = []; // Clear queue on game over
    player.b2b = false; // Reset B2B
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

  if (player.hold === null) {
    player.hold = player.matrix;
    player.holdType = player.type;
    playerReset(); // This spawns next piece
    player.canHold = false;
  } else {
    const tempMatrix = player.matrix;
    const tempType = player.type;

    player.matrix = player.hold;
    player.type = player.holdType;

    player.hold = tempMatrix;
    player.holdType = tempType;

    // Reset held piece rotation and position
    // Re-create matrix to reset state properly
    player.matrix = createPiece(player.type);
    player.rotation = 0;

    player.pos.y = 0;
    player.pos.x =
      ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    player.canHold = false;
  }
}

function playerRotate(dir) {
  const prevRotation = player.rotation;
  const nextRotation = (player.rotation + dir + 4) % 4;
  const initialX = player.pos.x;
  const initialY = player.pos.y;

  rotate(player.matrix, dir);

  const kicks = getSRSKicks(player.type, prevRotation, nextRotation);
  for (const [dx, dy] of kicks) {
    player.pos.x = initialX + dx;
    player.pos.y = initialY + dy;
    if (!collide(arena, player)) {
      player.rotation = nextRotation;
      player.lastMoveWasRotate = true;
      return;
    }
  }

  // Revert if no kick succeeded
  rotate(player.matrix, -dir);
  player.pos.x = initialX;
  player.pos.y = initialY;
}

// --- T-Spin Logic ---
// 3-Corner Rule: A T-Spin exists if at least 3 of the 4 corners around the T center are occupied.
// Also requires that the last move was a rotation.

function checkTSpinOnLock() {
  isTSpinLock = false; // Reset at start of check
  if (player.type === "T" && player.lastMoveWasRotate) {
    if (checkCorners()) {
      isTSpinLock = true; // Set flag for arenaSweep scoring
      showTSpinEffect();
    }
  }
}

function showTSpinEffect() {
  if (!player || !player.pos) return;
  const ctx = context;
  ctx.save();
  ctx.fillStyle = "white";
  ctx.font = "1px Arial";
  ctx.scale(0.05, 0.05);
  ctx.fillText("T-SPIN!", player.pos.x * 20, player.pos.y * 20);
  ctx.restore();
  drawTSpinCorners();
}

function drawTSpinCorners() {
  const cx = player.pos.x + 1; // Center X in arena
  const cy = player.pos.y + 1; // Center Y in arena
  const corners = [
    { x: cx - 1, y: cy - 1 },
    { x: cx + 1, y: cy - 1 },
    { x: cx - 1, y: cy + 1 },
    { x: cx + 1, y: cy + 1 },
  ];

  context.save();
  context.fillStyle = "rgba(255, 215, 0, 0.8)"; // Gold
  corners.forEach((c) => {
    // Only draw if inside bounds (even if wall)
    // We want to visualize the corner check
    // But walls are outside canvas drawing area?
    // No, arena coordinates map to canvas.
    // If it's a wall (x<0), we can't draw it easily unless we draw on border.
    // Let's just draw inside valid area.
    if (c.x >= 0 && c.x < 12 && c.y >= 0 && c.y < 20) {
      // Draw a small circle or rect at the corner block
      context.fillRect(c.x + 0.25, c.y + 0.25, 0.5, 0.5);
    }
  });
  context.restore();

  // Clear after a short delay
  setTimeout(() => {
    // This will be cleared on next draw frame anyway,
    // but if game is paused or slow, it stays.
    // Actually, draw() clears everything.
    // So this visual only lasts 1 frame unless we persist it.
    // To make it last, we should set a "visual effect" state.
    // But for now, since it's a demo, maybe just flashing it is enough?
    // The text "T-SPIN!" is also drawn once and cleared next frame.
    // We should add an effect system.
  }, 500);
}

function checkCorners() {
  // T piece center is at (1, 1) in the 3x3 matrix.
  // Corners are (0,0), (2,0), (0,2), (2,2).
  // We need to map these to arena coordinates.
  const cx = player.pos.x + 1; // Center X in arena
  const cy = player.pos.y + 1; // Center Y in arena

  const corners = [
    { x: cx - 1, y: cy - 1 },
    { x: cx + 1, y: cy - 1 },
    { x: cx - 1, y: cy + 1 },
    { x: cx + 1, y: cy + 1 },
  ];

  let occupied = 0;
  corners.forEach((c) => {
    if (c.x < 0 || c.x >= 12 || c.y >= 20) {
      // Out of bounds counts as occupied wall
      occupied++;
    } else if (c.y >= 0 && arena[c.y][c.x] !== 0) {
      occupied++;
    }
  });

  return occupied >= 3;
}

// AI / Auto Solver Logic
function aiStep() {
  if (isGameOver || isPaused) return;

  // Evaluate current piece
  const currentMove = getBestMove(arena, player, player.matrix);

  // Check if holding gives a better move
  let holdMove = null;
  let matrixIfHold = null;

  if (player.canHold) {
    if (player.hold) {
      matrixIfHold = player.hold;
    } else {
      // If hold is empty, holding pulls the NEXT piece from queue.
      const nextType = player.nextQueue[0];
      matrixIfHold = createPiece(nextType);
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

// Set up AI movement state for incremental movement (T-Spin version with SRS)
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

// Execute one step of AI movement (called each frame) - T-Spin version with SRS
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
      const testPlayer = {
        matrix: currentMatrix,
        pos: { x: x, y: player.pos.y },
      };

      // If immediate collision at spawn Y, skip
      if (collide(arena, testPlayer)) continue;

      // Determine if this move involves a T-Spin (rotation)
      // Note: `getBestMove` iterates rotations.
      // To properly detect T-Spin in simulation, we need to know if the final state was reached via rotation.
      // Since we iterate `rotate` then `drop`, the move logic in `getBestMove` is:
      // Rotate to `r` -> Move to `x` -> Drop.
      // But T-Spin requires the LAST action to be rotation.
      // This implies the piece fits into the slot via rotation.
      // Our `getBestMove` just places the piece at the bottom. It doesn't simulate pathfinding (SRS kicks).
      // BUT: if we assume we can get there, we can check if the final position satisfies the 3-corner rule.
      // However, strict T-Spin requires the last move to be a rotation.
      // For the BOT, we can just reward placing a T-Piece in a spot that satisfies 3-corner rule.
      // Whether it legally spun there is a pathfinding issue, but rewarding the *spot* is good enough for "T-Spin Bias".

      // Drop it to find landing position
      while (!collide(arena, testPlayer)) {
        testPlayer.pos.y++;
      }
      testPlayer.pos.y--; // Back up one

      let isTSpinCandidate = false;
      if (player.type === "T" || player.holdType === "T") {
        // Actually `pieceMatrix` corresponds to `player.type` (or hold) passed in.
        // We need to check corners of `testPlayer`
        // Re-use checkCorners logic but for `testPlayer`
        // Since `checkCorners` uses global `player`, we need to refactor it or duplicate logic.

        // Inline logic for efficiency
        const cx = testPlayer.pos.x + 1;
        const cy = testPlayer.pos.y + 1;
        const corners = [
          { x: cx - 1, y: cy - 1 },
          { x: cx + 1, y: cy - 1 },
          { x: cx - 1, y: cy + 1 },
          { x: cx + 1, y: cy + 1 },
        ];
        let occupied = 0;
        corners.forEach((c) => {
          if (c.x < 0 || c.x >= 12 || c.y >= 20) occupied++;
          else if (c.y >= 0 && arena[c.y][c.x] !== 0) occupied++;
        });
        if (occupied >= 3) isTSpinCandidate = true;
      }

      // Evaluate board state
      const score = evaluateBoard(arena, testPlayer, isTSpinCandidate);
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

function evaluateBoard(arena, player, isTSpinAttempt = false) {
  // Clone grid to simulate placement
  const grid = arena.map((row) => [...row]);

  // Merge player into grid
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

  let score =
    a * aggregateHeight + b * completeLines + c * holes + d * bumpiness;

  // T-Spin Bonus for Bot
  if (isTSpinBot && isTSpinAttempt) {
    // If this move is a T-Spin, add massive weight
    score += 1000;
  }

  return score;
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
    lang === "zh-Hant" ? `分數: ${player.score}` : `Score: ${player.score}`;
  levelElement.innerText =
    lang === "zh-Hant" ? `等級: ${player.level}` : `Level: ${player.level}`;

  // Show B2B in UI (Hack: append to Level for now or create new element)
  if (player.b2b) {
    levelElement.innerText += " (B2B)";
  }
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

autoBtn.addEventListener("click", () => {
  isAutoSolver = !isAutoSolver;
  isTSpinBot = false; // Disable T-Spin bot if normal auto is clicked

  // Set default speed for normal auto solver
  if (isAutoSolver) {
    autoSolverSpeed = 50;
    const speedSlider = document.getElementById("speedSlider");
    if (speedSlider) {
      speedSlider.value = 50;
      const speedValue = document.getElementById("speedValue");
      if (speedValue) {
        const lang = document.documentElement.lang;
        speedValue.textContent = "50" + (lang === "zh-Hant" ? "毫秒" : "ms");
      }
    }
  }

  updateAutoBtnStyles();
  btn.blur();
  autoBtn.blur();
});

tspinAutoBtn.addEventListener("click", () => {
  if (isAutoSolver && isTSpinBot) {
    isAutoSolver = false;
    isTSpinBot = false;
  } else {
    isAutoSolver = true;
    isTSpinBot = true;

    // Set default speed for T-Spin bot
    autoSolverSpeed = 300;
    const speedSlider = document.getElementById("speedSlider");
    if (speedSlider) {
      speedSlider.value = 300;
      const speedValue = document.getElementById("speedValue");
      if (speedValue) {
        const lang = document.documentElement.lang;
        speedValue.textContent = "300" + (lang === "zh-Hant" ? "毫秒" : "ms");
      }
    }
  }
  updateAutoBtnStyles();
  btn.blur();
  tspinAutoBtn.blur();
});

demoSetupBtn.addEventListener("click", () => {
  setupTSpinDemo();
  demoSetupBtn.blur();
});

// Function to set auto solver speed (called from HTML)
function setAutoSolverSpeed(speed) {
  autoSolverSpeed = Math.max(10, Math.min(1000, speed)); // Clamp between 10 and 1000ms
}

function updateAutoBtnStyles() {
  // Reset both
  autoBtn.style.backgroundColor = "#9c27b0";
  autoBtn.innerText =
    document.documentElement.lang === "zh-Hant"
      ? "自動解題 (一般)"
      : "Auto Solver (Normal)";

  tspinAutoBtn.style.backgroundColor = "#e91e63";
  tspinAutoBtn.innerText =
    document.documentElement.lang === "zh-Hant"
      ? "自動解題 (T-Spin)"
      : "Auto Solver (T-Spin)";

  if (isAutoSolver) {
    if (isTSpinBot) {
      tspinAutoBtn.style.backgroundColor = "#d32f2f";
      tspinAutoBtn.innerText =
        document.documentElement.lang === "zh-Hant" ? "停止自動" : "Stop Auto";
    } else {
      autoBtn.style.backgroundColor = "#d32f2f";
      autoBtn.innerText =
        document.documentElement.lang === "zh-Hant" ? "停止自動" : "Stop Auto";
    }
  }

  // Show/hide speed control
  const speedControl = document.getElementById("speedControl");
  if (speedControl) {
    speedControl.style.display = isAutoSolver ? "block" : "none";
  }
}

function setupTSpinDemo() {
  // Clear board
  arena.forEach((row) => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  player.b2b = false;
  updateScore();

  // Create T-Spin Double setup
  // Pattern:
  // X . X (Gap at x=2)
  // X X X (Row below)

  // Row 19 (Bottom): Fill all except col 2
  for (let x = 0; x < 12; x++) {
    if (x !== 2) arena[19][x] = 1; // Use color 1
  }
  // Row 18: Fill all except col 2
  for (let x = 0; x < 12; x++) {
    if (x !== 2) arena[18][x] = 1;
  }

  // Row 17: Fill all except 2 and 3.
  for (let x = 0; x < 12; x++) if (x !== 2 && x !== 3) arena[17][x] = 1;

  // Row 16: Overhang at 3.
  arena[16][3] = 1;
  // And fill rest of row 16 right side to be safe?
  for (let x = 4; x < 12; x++) arena[16][x] = 1;
  // Left side of 16
  arena[16][0] = 1;
  arena[16][1] = 1;

  // Give player a T piece
  player.type = "T";
  player.matrix = createPiece("T");
  player.nextQueue[0] = "T"; // Ensure next is T too just in case
  player.rotation = 0;
  player.pos.y = 0;
  player.pos.x = 4; // Center
  player.hold = null;

  // Force draw
  draw();

  // Auto-start?
  isGameOver = false;
  isPaused = false;
  update();
  btn.style.display = "none";
}

demoDTCannonBtn.addEventListener("click", () => {
  setupDTCannonDemo();
  demoDTCannonBtn.blur();
});

debugEffectBtn.addEventListener("click", () => {
  showTSpinEffect();
  debugEffectBtn.blur();
});

function setupDTCannonDemo() {
  // Clear board
  arena.forEach((row) => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  player.b2b = false;
  updateScore();

  // DT Cannon Setup (Right Side Version)
  // Structure:
  // 1. A base with a 2-wide well for the T-Spin Double -> Triple
  // 2. Specific overhangs

  // We will build the "DT Cannon" shape manually.
  // Based on standard diagram:
  // . . . . . . . . . .
  // . . . . . . . . . .
  // . . . . . . . . . . (T spawns here)
  // . . . . . . . . . .
  // . . . . . . . . . .
  //
  // Shape:
  // Row 19 (Bottom): X X X X X X X X . X (Hole at 8)
  // Row 18:          X X X X X X X X . X
  // Row 17:          X X X X X X X . . X (Hole at 7, 8) -> TSD setup
  // Row 16:          X X X X X X X . X X (Overhang at 9, Hole at 7)
  // Row 15:          X X X X X X X . . X (Roof?)

  // Let's use the schematic from the article (conceptually):
  // Double T-Spin (DT) Cannon involves a T-Spin Double followed by a Triple.
  // It requires a specific "L" and "J" overhang setup.

  // Simplified construction for Demo:
  // Fill Columns 0-5 completely at bottom (Left base)
  for (let y = 15; y < 20; y++) {
    for (let x = 0; x < 6; x++) {
      arena[y][x] = 1;
    }
  }

  // Fill Columns 9-11 completely at bottom (Right wall)
  for (let y = 15; y < 20; y++) {
    for (let x = 9; x < 12; x++) {
      arena[y][x] = 1;
    }
  }

  // Now the middle part (cols 6, 7, 8)
  // We need the DT shape.
  //
  // Row 19: Fill 6, 8 (Hole at 7?) -> Actually let's put hole at 7 for bottom.
  arena[19][6] = 1;
  arena[19][8] = 1;
  // Hole at 7 is the target for the Triple later?

  // Row 18: Fill 6, 8
  arena[18][6] = 1;
  arena[18][8] = 1;

  // Row 17: Fill 6. Empty 7, 8.
  arena[17][6] = 1;

  // Row 16: Empty 6, 7. Fill 8? (Overhang for TSD)
  arena[16][8] = 1;
  // Wait, DT Cannon usually has an overhang at the top to create the "Cave"

  // Let's follow a specific block map for the "Cannon" part
  //     X . .
  //     X . X
  //     X X X

  // Let's hardcode a known working DT shape on the right side.
  // Using coordinates relative to bottom (y=19)
  // Base floor at y=19 is solid except one hole?

  // Let's clear the area and draw explicitly

  // Fill almost everything for 5 rows
  for (let y = 15; y < 20; y++) {
    for (let x = 0; x < 12; x++) {
      if (x < 8 || x > 10) arena[y][x] = 1;
    }
  }
  // Now we have a well at 8, 9, 10? No 0-7 is 8 blocks. 8,9,10 empty. 11 filled.
  // Width 12. 0-7 filled (8 blocks). 11 filled (1 block). 8,9,10 empty (3 blocks).

  // Modify for DT Cannon:
  // We need a TSD slot first.
  // Place J and L overhangs.

  // L piece upside down on right?
  // J piece upside down on left?

  // Let's just build the block structure:
  // y=19: 0-7 filled, 8 empty, 9 filled, 10 empty, 11 filled? No standard is 2 wide well?

  // Let's do a "Double Double" setup (easier to visualize) or simple DT.
  // Simple DT:
  //   X . .
  //   X . X
  //   X X X
  //   X X X

  // Build the "DT" structure in columns 7,8,9
  // y=19: 7=X, 8=X, 9=X
  // y=18: 7=X, 8=X, 9=X
  // y=17: 7=X, 8=., 9=X (TSD slot)
  // y=16: 7=X, 8=., 9=. (The roof for TSD, and floor for TST?)
  // y=15: 7=., 8=., 9=X (Overhang)

  // Let's try this exact shape in the middle of the board.
  // Clear col 7,8,9 first
  for (let y = 15; y < 20; y++) {
    arena[y][7] = 0;
    arena[y][8] = 0;
    arena[y][9] = 0;
  }

  // Fill surrounding to make it a valid setup (walls)
  // 0-6 filled. 10-11 filled.
  for (let y = 15; y < 20; y++) {
    for (let x = 0; x <= 6; x++) arena[y][x] = 2;
    for (let x = 10; x <= 11; x++) arena[y][x] = 2;
  }

  // Construct DT mechanism in 7,8,9
  // Row 19 (Bottom)
  arena[19][7] = 3;
  arena[19][8] = 3;
  arena[19][9] = 3;
  // Row 18
  arena[18][7] = 3;
  arena[18][8] = 0;
  arena[18][9] = 3; // Hole at 8 for TST
  // Row 17
  arena[17][7] = 3;
  arena[17][8] = 0;
  arena[17][9] = 3;
  // Row 16 (The TSD notch)
  arena[16][7] = 3;
  arena[16][8] = 0;
  arena[16][9] = 0;
  // Row 15 (Overhang)
  arena[15][7] = 3;
  arena[15][8] = 0;
  arena[15][9] = 3; // Wait, we need to cover the top-right of the T

  // Actually, for TSD, we need:
  //   X . X
  //   X X X
  // The T goes into the T-shape hole.

  // Correct DT Setup (approximate):
  //    . X    (Overhangs)
  //  X . . X
  //  X . X X
  //  X X X X

  // Let's re-do the inner 7,8,9
  arena[19][7] = 3;
  arena[19][8] = 3;
  arena[19][9] = 3;
  arena[18][7] = 3;
  arena[18][8] = 0;
  arena[18][9] = 3; // The Triple Well
  arena[17][7] = 3;
  arena[17][8] = 0;
  arena[17][9] = 3;
  arena[16][7] = 3;
  arena[16][8] = 0;
  arena[16][9] = 0; // TSD Well
  arena[15][7] = 3;
  arena[15][8] = 0;
  arena[15][9] = 3; // Overhang at 9

  // Also need a roof at 7?
  arena[14][7] = 3;
  arena[14][8] = 0;
  arena[14][9] = 0;

  // Give player a T piece
  player.type = "T";
  player.matrix = createPiece("T");
  player.nextQueue = ["T", "T", "T", "T", "T"]; // All T's for fun
  player.rotation = 0;
  player.pos.y = 0;
  player.pos.x = 4;
  player.hold = null;

  draw();
  isGameOver = false;
  isPaused = false;
  update();
  btn.style.display = "none";
}

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
    player.holdType = null;
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
