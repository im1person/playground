const GRID_SIZE = 9;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

const difficultyConfig = {
  easy: { minClues: 36, maxClues: 40, maxAttempts: 4 },
  normal: { minClues: 32, maxClues: 35, maxAttempts: 5 },
  hard: { minClues: 28, maxClues: 31, maxAttempts: 6 },
  master: { minClues: 24, maxClues: 27, maxAttempts: 8 },
};

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function shuffle(list) {
  const array = list.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function indexToRowCol(index) {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function rowColToIndex(row, col) {
  return row * GRID_SIZE + col;
}

function isSafe(board, row, col, value) {
  for (let c = 0; c < GRID_SIZE; c += 1) {
    if (board[rowColToIndex(row, c)] === value) return false;
  }
  for (let r = 0; r < GRID_SIZE; r += 1) {
    if (board[rowColToIndex(r, col)] === value) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (board[rowColToIndex(startRow + r, startCol + c)] === value) {
        return false;
      }
    }
  }
  return true;
}

function fillBoard(board, index = 0) {
  if (index >= CELL_COUNT) return true;
  if (board[index] !== 0) return fillBoard(board, index + 1);

  const { row, col } = indexToRowCol(index);
  for (const value of shuffle(digits)) {
    if (isSafe(board, row, col, value)) {
      board[index] = value;
      if (fillBoard(board, index + 1)) return true;
      board[index] = 0;
    }
  }
  return false;
}

function generateCompleteBoard() {
  const board = new Array(CELL_COUNT).fill(0);
  if (!fillBoard(board, 0)) {
    throw new Error("Failed to generate a complete Sudoku board");
  }
  return board;
}

function solveAndCount(board, limit = 2) {
  const grid = board.slice();
  let solutions = 0;

  function findEmpty() {
    return grid.findIndex((value) => value === 0);
  }

  function backtrack() {
    if (solutions >= limit) return true;
    const idx = findEmpty();
    if (idx === -1) {
      solutions += 1;
      return solutions >= limit;
    }
    const { row, col } = indexToRowCol(idx);
    for (const value of digits) {
      if (isSafe(grid, row, col, value)) {
        grid[idx] = value;
        if (backtrack()) return true;
        grid[idx] = 0;
      }
    }
    return false;
  }

  backtrack();
  return { solutions, solution: grid.slice() };
}

function carveClues(fullBoard, config) {
  const board = fullBoard.slice();
  const positions = shuffle([...Array(CELL_COUNT).keys()]);
  const targetClues = Math.floor((config.minClues + config.maxClues) / 2);
  let clues = CELL_COUNT;

  for (const index of positions) {
    if (clues <= targetClues) break;
    const backup = board[index];
    if (backup === 0) continue;
    board[index] = 0;
    const { solutions } = solveAndCount(board, 2);
    if (solutions !== 1) {
      board[index] = backup;
    } else {
      clues -= 1;
    }
  }

  return { puzzle: board, clues };
}

export function generatePuzzle(difficulty = "easy") {
  const config = difficultyConfig[difficulty] || difficultyConfig.easy;
  const attempts = config.maxAttempts ?? 5;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const fullBoard = generateCompleteBoard();
      const { puzzle, clues } = carveClues(fullBoard, config);
      const solved = fullBoard.slice();
      return {
        grid: puzzle,
        solution: solved,
        metadata: {
          difficulty,
          clueCount: clues,
          generatorAttempt: attempt + 1,
          generatedAt: Date.now(),
        },
      };
    } catch (error) {
      // try again
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  throw new Error(
    `Unable to generate Sudoku puzzle for difficulty "${difficulty}"`
  );
}
