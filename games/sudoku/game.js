import { getParsedPuzzles } from "./puzzle-data.js";
import { generatePuzzle } from "./generator.js";

const SudokuApp = (() => {
  const GRID_SIZE = 9;
  const BOARD_CELLS = GRID_SIZE * GRID_SIZE;

  const selectors = {
    board: () => document.getElementById("sudokuBoard"),
    difficulty: () => document.getElementById("difficultySelect"),
    timer: () => document.getElementById("timerDisplay"),
    mistakes: () => document.getElementById("mistakeDisplay"),
    padButtons: () => document.querySelectorAll(".pad-btn"),
    controlPanel: () => document.querySelector(".control-buttons"),
    notesToggle: () => document.getElementById("notesToggle"),
    savedReset: () => document.getElementById("resetProgress"),
    modal: () => document.getElementById("victoryModal"),
    modalButtons: () => document.querySelectorAll(".modal-actions button"),
    modalBody: () => document.getElementById("victoryStats"),
  };

  const puzzleBank = getParsedPuzzles();

  const defaultState = () => ({
    difficulty: "easy",
    grid: new Array(BOARD_CELLS).fill(0),
    solution: new Array(BOARD_CELLS).fill(0),
    notes: Array.from({ length: BOARD_CELLS }, () => new Set()),
    givens: new Set(),
    selectedIndex: null,
    mistakes: 0,
    maxMistakes: 3,
    noteMode: false,
    undoStack: [],
    redoStack: [],
    timerStart: null,
    elapsedSeconds: 0,
  });

  const state = defaultState();

  const utils = {
    row(idx) {
      return Math.floor(idx / GRID_SIZE);
    },
    col(idx) {
      return idx % GRID_SIZE;
    },
    box(idx) {
      const r = utils.row(idx);
      const c = utils.col(idx);
      return Math.floor(r / 3) * 3 + Math.floor(c / 3);
    },
    formatTime(totalSeconds) {
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      return `${minutes}:${seconds}`;
    },
    cloneNotes(notes) {
      return notes.map((set) => new Set(set));
    },
    deepCloneGrid(grid) {
      return grid.slice();
    },
    randomPick(list) {
      if (!list.length) return null;
      const index = Math.floor(Math.random() * list.length);
      return list[index];
    },
  };

  const board = {
    render() {
      const host = selectors.board();
      if (!host) return;
      host.innerHTML = "";

      for (let index = 0; index < BOARD_CELLS; index += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.index = String(index);
        cell.dataset.row = String(utils.row(index));
        cell.dataset.col = String(utils.col(index));
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Cell ${index + 1}`);

        const value = document.createElement("div");
        value.className = "cell-value";
        const notes = document.createElement("div");
        notes.className = "cell-notes";
        for (let i = 1; i <= 9; i += 1) {
          const span = document.createElement("span");
          span.textContent = i;
          span.dataset.value = String(i);
          notes.appendChild(span);
        }

        cell.appendChild(value);
        cell.appendChild(notes);
        cell.addEventListener("click", () => board.select(index));
        host.appendChild(cell);
      }
    },
    select(index) {
      state.selectedIndex = index;
      document
        .querySelectorAll(".cell.selected")
        .forEach((el) => el.classList.remove("selected"));
      const node = selectors.board()?.querySelector(`[data-index="${index}"]`);
      if (node) node.classList.add("selected");
      board.highlight(index);
    },
    highlight(index) {
      const host = selectors.board();
      if (!host) return;

      host.querySelectorAll(".cell.highlight").forEach((cell) => {
        cell.classList.remove("highlight");
      });
      host.querySelectorAll(".cell.value-match").forEach((cell) => {
        cell.classList.remove("value-match");
      });

      if (index == null) return;
      const row = utils.row(index);
      const col = utils.col(index);
      const value = state.grid[index];

      host.querySelectorAll(".cell").forEach((cell) => {
        const cellRow = Number(cell.dataset.row);
        const cellCol = Number(cell.dataset.col);
        if (cellRow === row || cellCol === col) {
          cell.classList.add("highlight");
        }
        const idx = Number(cell.dataset.index);
        if (value && state.grid[idx] === value) {
          cell.classList.add("value-match");
        }
      });
    },
    paint() {
      const host = selectors.board();
      if (!host) return;
      state.grid.forEach((value, idx) => {
        const cell = host.querySelector(`[data-index="${idx}"]`);
        if (!cell) return;
        const valueNode = cell.querySelector(".cell-value");
        const noteNode = cell.querySelector(".cell-notes");
        valueNode.textContent = value || "";
        const isConflict = value && state.solution[idx] !== value;
        cell.classList.toggle("conflict", Boolean(isConflict));
        cell.classList.toggle("given", state.givens.has(idx));
        cell.classList.toggle("has-value", Boolean(value));
        cell.classList.toggle(
          "note-visible",
          value === 0 && state.notes[idx].size
        );
        if (noteNode) {
          noteNode.querySelectorAll("span").forEach((span) => {
            const noteValue = Number(span.dataset.value);
            span.style.opacity = state.notes[idx].has(noteValue) ? "1" : "0.15";
          });
        }
      });
      selectors.mistakes().textContent = `${state.mistakes} / ${state.maxMistakes}`;
    },
    flashError(index) {
      const cell = selectors
        .board()
        ?.querySelector(`.cell[data-index="${index}"]`);
      if (!cell) return;
      cell.classList.add("error");
      setTimeout(() => cell.classList.remove("error"), 400);
    },
  };

  const solver = {
    isSafe(grid, pos, value) {
      const row = utils.row(pos);
      const col = utils.col(pos);
      for (let c = 0; c < GRID_SIZE; c += 1) {
        if (grid[row * GRID_SIZE + c] === value) return false;
      }
      for (let r = 0; r < GRID_SIZE; r += 1) {
        if (grid[r * GRID_SIZE + col] === value) return false;
      }
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          if (grid[(boxRow + r) * GRID_SIZE + (boxCol + c)] === value) {
            return false;
          }
        }
      }
      return true;
    },
    solve(grid) {
      const attempt = grid.slice();
      const stack = [];

      const findEmpty = () => attempt.findIndex((val) => val === 0);
      const step = () => {
        const idx = findEmpty();
        if (idx === -1) return true;
        for (let num = 1; num <= 9; num += 1) {
          if (solver.isSafe(attempt, idx, num)) {
            attempt[idx] = num;
            stack.push({ idx, num });
            if (step()) return true;
            stack.pop();
            attempt[idx] = 0;
          }
        }
        return false;
      };

      const solved = step();
      return solved ? attempt : null;
    },
  };

  const puzzle = {
    getPuzzle(difficulty = state.difficulty) {
      try {
        const generated = generatePuzzle(difficulty);
        return {
          ...generated,
          metadata: {
            ...generated.metadata,
            source: "generator",
          },
        };
      } catch (error) {
        console.warn(
          "[SudokuApp] Generator failed, falling back to curated puzzles:",
          error
        );
      }
      const pool = puzzleBank[difficulty] || puzzleBank.easy;
      const pick = utils.randomPick(pool);
      return {
        grid: pick.grid.slice(),
        solution: pick.solution.slice(),
        metadata: { difficulty, generatedAt: Date.now(), source: "curated" },
      };
    },
  };

  const history = {
    push() {
      state.undoStack.push({
        grid: utils.deepCloneGrid(state.grid),
        notes: utils.cloneNotes(state.notes),
        mistakes: state.mistakes,
      });
      if (state.undoStack.length > 100) state.undoStack.shift();
      state.redoStack = [];
    },
    apply(record) {
      state.grid = utils.deepCloneGrid(record.grid);
      state.notes = utils.cloneNotes(record.notes);
      state.mistakes = record.mistakes;
      board.paint();
      board.highlight(state.selectedIndex);
      storage.save();
    },
    undo() {
      if (!state.undoStack.length) return;
      const snapshot = state.undoStack.pop();
      state.redoStack.push({
        grid: utils.deepCloneGrid(state.grid),
        notes: utils.cloneNotes(state.notes),
        mistakes: state.mistakes,
      });
      history.apply(snapshot);
    },
    redo() {
      if (!state.redoStack.length) return;
      const snapshot = state.redoStack.pop();
      state.undoStack.push({
        grid: utils.deepCloneGrid(state.grid),
        notes: utils.cloneNotes(state.notes),
        mistakes: state.mistakes,
      });
      history.apply(snapshot);
    },
  };

  const storage = {
    key: "sudoku-current",
    save() {
      try {
        localStorage.setItem(
          this.key,
          JSON.stringify({
            difficulty: state.difficulty,
            grid: state.grid,
            solution: state.solution,
            notes: state.notes.map((set) => [...set]),
            givens: [...state.givens],
            selectedIndex: state.selectedIndex,
            mistakes: state.mistakes,
            maxMistakes: state.maxMistakes,
            noteMode: state.noteMode,
            elapsedSeconds: state.elapsedSeconds,
          })
        );
      } catch (err) {
        console.error("Failed to persist Sudoku state", err);
      }
    },
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (!raw) return false;
        const snapshot = JSON.parse(raw);
        Object.assign(state, defaultState(), snapshot, {
          notes: snapshot.notes.map((arr) => new Set(arr)),
          givens: new Set(snapshot.givens),
        });
        selectors.difficulty().value = state.difficulty;
        const notesToggle = selectors.notesToggle();
        if (notesToggle) {
          notesToggle.classList.toggle("active", state.noteMode);
          notesToggle.setAttribute(
            "aria-pressed",
            state.noteMode ? "true" : "false"
          );
        }
        board.paint();
        board.highlight(state.selectedIndex);
        return true;
      } catch (err) {
        console.error("Failed to load Sudoku state", err);
        return false;
      }
    },
    clear() {
      localStorage.removeItem(this.key);
      Object.assign(state, defaultState());
      board.paint();
      selectors.difficulty().value = state.difficulty;
      selectors.timer().textContent = utils.formatTime(0);
    },
  };

  const controls = {
    bind() {
      selectors.difficulty()?.addEventListener("change", (event) => {
        const value = event.target.value;
        state.difficulty = value;
        controls.newPuzzle(true);
      });

      selectors.padButtons().forEach((button) => {
        button.addEventListener("click", () => {
          const { value, action } = button.dataset;
          if (value) {
            controls.inputValue(Number(value));
          } else if (action) {
            controls.handleUtility(action);
          }
        });
      });

      document.addEventListener("keydown", controls.handleKeydown);

      selectors.controlPanel()?.addEventListener("click", (event) => {
        const target = event.target.closest("button[data-action]");
        if (!target) return;
        controls.handleUtility(target.dataset.action);
      });

      selectors.savedReset()?.addEventListener("click", () => {
        if (confirm("Clear saved Sudoku progress?")) {
          storage.clear();
          controls.newPuzzle(true);
        }
      });

      selectors.modalButtons().forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.action;
          if (action === "replay") {
            controls.newPuzzle(true);
          }
          selectors.modal()?.close();
        });
      });
    },
    handleKeydown(event) {
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT"
      ) {
        return;
      }
      const key = event.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        event.preventDefault();
        controls.moveSelection(key);
        return;
      }
      if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        controls.inputValue(Number(key));
        return;
      }
      if (key === "0" || key === "Backspace" || key === "Delete") {
        event.preventDefault();
        controls.eraseCell();
        return;
      }
      if (key === "Shift" && !event.repeat) {
        selectors.notesToggle()?.click();
      }
    },
    moveSelection(direction) {
      if (state.selectedIndex == null) {
        board.select(0);
        return;
      }
      const row = utils.row(state.selectedIndex);
      const col = utils.col(state.selectedIndex);
      let target = state.selectedIndex;
      switch (direction) {
        case "ArrowUp":
          target =
            row > 0 ? state.selectedIndex - GRID_SIZE : state.selectedIndex;
          break;
        case "ArrowDown":
          target =
            row < GRID_SIZE - 1
              ? state.selectedIndex + GRID_SIZE
              : state.selectedIndex;
          break;
        case "ArrowLeft":
          target = col > 0 ? state.selectedIndex - 1 : state.selectedIndex;
          break;
        case "ArrowRight":
          target =
            col < GRID_SIZE - 1 ? state.selectedIndex + 1 : state.selectedIndex;
          break;
        default:
          break;
      }
      board.select(target);
    },
    toggleNotes() {
      state.noteMode = !state.noteMode;
      const toggle = selectors.notesToggle();
      if (!toggle) return;
      toggle.classList.toggle("active", state.noteMode);
      toggle.setAttribute("aria-pressed", state.noteMode ? "true" : "false");
    },
    inputValue(value) {
      if (state.selectedIndex == null) return;
      if (state.givens.has(state.selectedIndex)) return;
      if (state.noteMode) {
        history.push();
        const notes = state.notes[state.selectedIndex];
        if (notes.has(value)) {
          notes.delete(value);
        } else {
          notes.add(value);
        }
        board.paint();
        storage.save();
        return;
      }
      history.push();
      state.notes[state.selectedIndex].clear();
      if (state.solution[state.selectedIndex] === value) {
        state.grid[state.selectedIndex] = value;
      } else {
        state.grid[state.selectedIndex] = value;
        state.mistakes += 1;
        board.flashError(state.selectedIndex);
      }
      board.paint();
      storage.save();
      controls.checkCompletion();
    },
    handleUtility(action) {
      switch (action) {
        case "erase":
          controls.eraseCell();
          break;
        case "notes":
          controls.toggleNotes();
          break;
        case "new":
          controls.newPuzzle(true);
          break;
        case "hint":
          controls.hint();
          break;
        case "auto":
          controls.autoSolve();
          break;
        case "undo":
          history.undo();
          break;
        case "redo":
          history.redo();
          break;
        default:
          break;
      }
    },
    eraseCell() {
      if (state.selectedIndex == null) return;
      if (state.givens.has(state.selectedIndex)) return;
      if (
        !state.grid[state.selectedIndex] &&
        !state.notes[state.selectedIndex].size
      )
        return;
      history.push();
      state.grid[state.selectedIndex] = 0;
      state.notes[state.selectedIndex].clear();
      board.paint();
      storage.save();
    },
    newPuzzle(resetTimer = false) {
      const nextPuzzle = puzzle.getPuzzle(state.difficulty);
      Object.assign(state, defaultState(), nextPuzzle, {
        difficulty: state.difficulty,
        grid: nextPuzzle.grid.slice(),
        solution: nextPuzzle.solution.slice(),
        givens: new Set(
          nextPuzzle.grid
            .map((value, idx) => (value ? idx : null))
            .filter((idx) => idx != null)
        ),
      });
      state.timerStart = Date.now();
      state.elapsedSeconds = 0;
      state.undoStack = [];
      state.redoStack = [];
      state.noteMode = false;
      const notesToggle = selectors.notesToggle();
      if (notesToggle) {
        notesToggle.classList.remove("active");
        notesToggle.setAttribute("aria-pressed", "false");
      }
      board.paint();
      board.select(0);
      storage.save();
      if (resetTimer) {
        timer.reset();
      }
    },
    hint() {
      let target = state.selectedIndex;
      const isTargetHintable =
        target != null &&
        !state.givens.has(target) &&
        state.solution[target] !== state.grid[target];

      if (!isTargetHintable) {
        target = state.grid.findIndex(
          (value, idx) => value === 0 && !state.givens.has(idx)
        );
      }

      if (target == null || target === -1) return;
      history.push();
      state.grid[target] = state.solution[target];
      state.notes[target].clear();
      board.paint();
      board.select(target);
      storage.save();
      controls.checkCompletion();
    },
    autoSolve() {
      if (!confirm("Auto-solve will fill the entire puzzle. Continue?")) return;
      history.push();
      state.grid = state.solution.slice();
      state.notes = Array.from({ length: BOARD_CELLS }, () => new Set());
      board.paint();
      storage.save();
      controls.finishPuzzle(true);
    },
    checkCompletion() {
      const isComplete = state.grid.every(
        (value, idx) => value === state.solution[idx]
      );
      if (isComplete) {
        controls.finishPuzzle(false);
      }
    },
    finishPuzzle(auto) {
      timer.stop();
      const modal = selectors.modal();
      const stats = selectors.modalBody();
      if (stats) {
        stats.textContent = `Time: ${utils.formatTime(
          state.elapsedSeconds
        )} · Mistakes: ${state.mistakes} ${auto ? "(auto-solved)" : ""}`;
      }
      modal?.showModal();
    },
  };

  const timer = {
    tickHandle: null,
    start() {
      if (this.tickHandle) return;
      state.timerStart = Date.now() - state.elapsedSeconds * 1000;
      this.tickHandle = window.setInterval(this.update, 1000);
    },
    reset() {
      this.stop();
      state.elapsedSeconds = 0;
      selectors.timer().textContent = utils.formatTime(0);
      this.start();
    },
    stop() {
      if (!this.tickHandle) return;
      window.clearInterval(this.tickHandle);
      this.tickHandle = null;
    },
    update() {
      state.elapsedSeconds = Math.floor((Date.now() - state.timerStart) / 1000);
      selectors.timer().textContent = utils.formatTime(state.elapsedSeconds);
      storage.save();
    },
  };

  function init() {
    board.render();
    controls.bind();
    const restored = storage.load();
    if (!restored) {
      controls.newPuzzle(true);
    } else {
      selectors.timer().textContent = utils.formatTime(
        state.elapsedSeconds || 0
      );
      board.paint();
      board.highlight(state.selectedIndex);
    }
    timer.start();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => SudokuApp.init());
