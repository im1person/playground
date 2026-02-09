class ChessGame {
  constructor() {
    this.engine = new ChessEngine();
    this.mode = "two-player";
    this.difficulty = 2;
    this.selected = null;
    this.legalMoves = [];
    this.history = [];
    this.puzzleIndex = 0;
    this.solutionProgress = 0;
    this.statusEl = document.getElementById("status");
    this.historyEl = document.getElementById("moveList");
    this.boardEl = document.getElementById("board");
    this.modeSelect = document.getElementById("modeSelect");
    this.diffSelect = document.getElementById("difficulty");
    this.newBtn = document.getElementById("newGame");
    this.undoBtn = document.getElementById("undo");
    this.redoStack = [];
    this._bindUI();
    this.renderBoard();
    this.updateStatus();
    
    // Listen for locale changes to update status text
    document.addEventListener("localechange", () => {
      this.updateStatus();
    });
  }

  _bindUI() {
    this.boardEl.addEventListener("click", (e) => {
      const cell = e.target.closest(".square");
      if (!cell) return;
      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);
      this.handleSquareClick({ r, c });
    });
    this.modeSelect.addEventListener("change", () => {
      this.setMode(this.modeSelect.value);
    });
    this.diffSelect.addEventListener("change", () => {
      this.difficulty = parseInt(this.diffSelect.value, 10);
    });
    this.newBtn.addEventListener("click", () => this.newGame());
    this.undoBtn.addEventListener("click", () => this.undo());
  }

  renderBoard() {
    this.boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement("div");
        square.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
        square.dataset.r = r;
        square.dataset.c = c;
        const piece = this.engine.getPiece(r, c);
        if (piece) {
          const span = document.createElement("span");
          span.className = "piece";
          span.textContent = this.getPieceSymbol(piece);
          square.appendChild(span);
        }
        if (this.selected && this.selected.r === r && this.selected.c === c) {
          square.classList.add("selected");
        }
        if (this.legalMoves.some((m) => m.to.r === r && m.to.c === c)) {
          square.classList.add("legal");
        }
        this.boardEl.appendChild(square);
      }
    }
    this.renderHistory();
  }

  getPieceSymbol(piece) {
    const map = {
      pw: "♙",
      pb: "♟",
      nw: "♘",
      nb: "♞",
      bw: "♗",
      bb: "♝",
      rw: "♖",
      rb: "♜",
      qw: "♕",
      qb: "♛",
      kw: "♔",
      kb: "♚",
    };
    return map[piece.type + piece.color] || "?";
  }

  handleSquareClick(coord) {
    const piece = this.engine.getPiece(coord.r, coord.c);
    const gameOver = this.engine.isCheckmate() || this.engine.isStalemate();
    if (gameOver) return;

    // Select own piece
    if (piece && piece.color === this.engine.turn) {
      this.selected = coord;
      this.legalMoves = this.engine.getLegalMoves(coord);
      this.renderBoard();
      return;
    }

    // Move
    if (this.selected) {
      const move = this.legalMoves.find(
        (m) => m.to.r === coord.r && m.to.c === coord.c
      );
      if (move) {
        this.makeMove(move);
      }
    }
  }

  makeMove(move) {
    const success = this.engine.makeMove(move);
    if (!success) return;
    this.history.push(move);
    this.redoStack = [];
    this.selected = null;
    this.legalMoves = [];

    // Puzzle validation
    if (this.mode === "puzzle") {
      const puzzle = window.CHESS_PUZZLES[this.puzzleIndex];
      const step = puzzle.solution[this.solutionProgress];
      const algebraicMove =
        this._coordsToAlg(move.from) + "-" + this._coordsToAlg(move.to);
      const stepAlg = step.from + "-" + step.to;
      if (algebraicMove === stepAlg) {
        this.solutionProgress++;
        if (this.solutionProgress >= puzzle.solution.length) {
          this.statusEl.textContent = "Puzzle solved!";
        }
      } else {
        this.statusEl.textContent = "Incorrect move, try again.";
      }
    }

    this.renderBoard();
    this.updateStatus();

    if (this.mode === "ai" && this.engine.turn === "b") {
      setTimeout(() => this.makeAIMove(), 50);
    }
  }

  updateStatus() {
    const locale = document.documentElement.lang || "en";
    const isZh = (locale === "zh-HK" || locale === "zh-Hant");
    
    if (this.engine.isCheckmate()) {
      this.statusEl.textContent = isZh ? "將死！" : "Checkmate!";
      return;
    }
    if (this.engine.isStalemate()) {
      this.statusEl.textContent = isZh ? "和棋。" : "Stalemate.";
      return;
    }
    const turnText =
      this.engine.turn === "w"
        ? isZh ? "白方走棋" : "White to move"
        : isZh ? "黑方走棋" : "Black to move";
    const inCheck = this.engine.isInCheck(this.engine.turn)
      ? isZh ? " (被將軍)" : " (in check)"
      : "";
    this.statusEl.textContent = `${turnText}${inCheck}`;
  }

  renderHistory() {
    this.historyEl.innerHTML = "";
    this.history.forEach((m, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${this._coordsToAlg(
        m.from
      )}-${this._coordsToAlg(m.to)}`;
      this.historyEl.appendChild(li);
    });
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === "puzzle") {
      this.loadPuzzle(0);
    } else {
      this.newGame();
    }
  }

  newGame() {
    this.engine.reset();
    this.history = [];
    this.redoStack = [];
    this.selected = null;
    this.legalMoves = [];
    if (this.mode === "puzzle") {
      this.loadPuzzle(this.puzzleIndex);
    }
    this.renderBoard();
    this.updateStatus();
  }

  loadPuzzle(index) {
    const puzzle = window.CHESS_PUZZLES[index % window.CHESS_PUZZLES.length];
    this.puzzleIndex = index % window.CHESS_PUZZLES.length;
    this.engine.loadFEN(puzzle.fen);
    this.history = [];
    this.redoStack = [];
    this.solutionProgress = 0;
    this.selected = null;
    this.legalMoves = [];
    this.renderBoard();
    this.updateStatus();
    this.statusEl.textContent = `Puzzle: ${puzzle.name}`;
  }

  undo() {
    const ok = this.engine.undoMove();
    if (!ok) return;
    const last = this.history.pop();
    if (last) this.redoStack.push(last);
    this.selected = null;
    this.legalMoves = [];
    this.renderBoard();
    this.updateStatus();
  }

  makeAIMove() {
    const move = this.getBestMove(this.difficulty);
    if (move) this.makeMove(move);
  }

  getBestMove(depth) {
    const engine = this.engine;
    const maximizing = engine.turn === "w";
    let bestMove = null;
    let bestScore = maximizing ? -Infinity : Infinity;

    const moves = engine.getAllLegalMoves();
    for (const mv of moves) {
      const next = engine.clone();
      next.makeMove(mv);
      const score = this._minimax(
        next,
        depth - 1,
        -Infinity,
        Infinity,
        !maximizing
      );
      if (maximizing && score > bestScore) {
        bestScore = score;
        bestMove = mv;
      }
      if (!maximizing && score < bestScore) {
        bestScore = score;
        bestMove = mv;
      }
    }
    return bestMove;
  }

  _minimax(engine, depth, alpha, beta, maximizing) {
    if (depth === 0 || engine.isCheckmate() || engine.isStalemate()) {
      const matePenalty = engine.isCheckmate()
        ? maximizing
          ? -99999
          : 99999
        : 0;
      return engine.evaluate() + matePenalty;
    }
    const moves = engine.getAllLegalMoves();
    if (maximizing) {
      let value = -Infinity;
      for (const mv of moves) {
        const next = engine.clone();
        next.makeMove(mv);
        value = Math.max(
          value,
          this._minimax(next, depth - 1, alpha, beta, false)
        );
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    } else {
      let value = Infinity;
      for (const mv of moves) {
        const next = engine.clone();
        next.makeMove(mv);
        value = Math.min(
          value,
          this._minimax(next, depth - 1, alpha, beta, true)
        );
        beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
      return value;
    }
  }

  _coordsToAlg(coord) {
    return String.fromCharCode(97 + coord.c) + (8 - coord.r);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new ChessGame();
});
