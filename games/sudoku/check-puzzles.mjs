#!/usr/bin/env node
import { puzzleData, parsePuzzle } from "./puzzle-data.js";

const GRID_SIZE = 9;
const CELLS = GRID_SIZE * GRID_SIZE;

function row(index) {
  return Math.floor(index / GRID_SIZE);
}

function col(index) {
  return index % GRID_SIZE;
}

function isSafe(board, index, value) {
  const r = row(index);
  const c = col(index);
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (board[r * GRID_SIZE + i] === value) return false;
    if (board[i * GRID_SIZE + c] === value) return false;
  }
  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let rr = 0; rr < 3; rr += 1) {
    for (let cc = 0; cc < 3; cc += 1) {
      if (board[(boxRow + rr) * GRID_SIZE + (boxCol + cc)] === value) {
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board, limit = 2) {
  const grid = board.slice();
  let solutions = 0;
  let firstSolution = null;

  function backtrack() {
    const idx = grid.findIndex((value) => value === 0);
    if (idx === -1) {
      solutions += 1;
      if (!firstSolution) {
        firstSolution = grid.slice();
      }
      return solutions >= limit;
    }
    for (let value = 1; value <= 9; value += 1) {
      if (isSafe(grid, idx, value)) {
        grid[idx] = value;
        if (backtrack()) return true;
        grid[idx] = 0;
      }
    }
    return false;
  }

  backtrack();
  return { solutions, solution: firstSolution };
}

function validatePuzzle(rawEntry, difficulty) {
  const parsed = parsePuzzle(rawEntry);
  if (parsed.grid.length !== CELLS || parsed.solution.length !== CELLS) {
    throw new Error(`${parsed.id} has invalid grid length`);
  }
  parsed.grid.forEach((value, idx) => {
    if (value && value !== parsed.solution[idx]) {
      throw new Error(
        `${parsed.id} has inconsistent clue at index ${idx}: ${value} vs solution ${parsed.solution[idx]}`
      );
    }
  });

  const { solutions, solution } = countSolutions(parsed.grid);
  if (solutions === 0) {
    throw new Error(`${parsed.id} is unsolvable`);
  }
  if (solutions > 1) {
    throw new Error(
      `${parsed.id} is not unique (solutions found: ${solutions})`
    );
  }
  const solutionString = solution.join("");
  if (solutionString !== parsed.solution.join("")) {
    throw new Error(`${parsed.id} solution mismatch: solver=${solutionString}`);
  }
  return {
    id: parsed.id,
    difficulty,
  };
}

function main() {
  const summary = [];
  try {
    Object.entries(puzzleData).forEach(([difficulty, entries]) => {
      entries.forEach((entry) => {
        const result = validatePuzzle(entry, difficulty);
        summary.push(result);
      });
    });
    console.log(
      `✅ Validated ${summary.length} puzzles across ${
        new Set(summary.map((item) => item.difficulty)).size
      } difficulties.`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Puzzle validation failed:", error.message);
    process.exit(1);
  }
}

main();
