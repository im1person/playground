class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this._createEmptyBoard();
    this._loadStartPosition();
    this.turn = "w";
    this.castling = { K: true, Q: true, k: true, q: true };
    this.enPassant = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  _createEmptyBoard() {
    return Array.from({ length: 8 }, () => Array(8).fill(null));
  }

  _loadStartPosition() {
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    this.board[0] = back.map((t) => ({ type: t, color: "b" }));
    this.board[1] = Array(8).fill({ type: "p", color: "b" });
    this.board[6] = Array(8).fill({ type: "p", color: "w" });
    this.board[7] = back.map((t) => ({ type: t, color: "w" }));
  }

  loadFEN(fen, { clearHistory = true } = {}) {
    const [
      piecePlacement,
      activeColor,
      castling,
      enPassant,
      halfmove,
      fullmove,
    ] = fen.split(" ");
    this.board = this._createEmptyBoard();
    const rows = piecePlacement.split("/");
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) {
          c += parseInt(ch, 10);
        } else {
          const color = ch === ch.toUpperCase() ? "w" : "b";
          const type = ch.toLowerCase();
          this.board[r][c] = { type, color };
          c++;
        }
      }
    }
    this.turn = activeColor;
    this.castling = {
      K: castling.includes("K"),
      Q: castling.includes("Q"),
      k: castling.includes("k"),
      q: castling.includes("q"),
    };
    this.enPassant =
      enPassant === "-" ? null : this._algebraicToCoords(enPassant);
    this.halfmoveClock = parseInt(halfmove, 10);
    this.fullmoveNumber = parseInt(fullmove, 10);
    if (clearHistory) {
      this.history = [];
    }
  }

  toFEN() {
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let row = "";
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) {
          empty++;
        } else {
          if (empty) {
            row += empty;
            empty = 0;
          }
          const letter =
            piece.color === "w" ? piece.type.toUpperCase() : piece.type;
          row += letter;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const castling =
      (this.castling.K ? "K" : "") +
        (this.castling.Q ? "Q" : "") +
        (this.castling.k ? "k" : "") +
        (this.castling.q ? "q" : "") || "-";
    const ep = this.enPassant ? this._coordsToAlgebraic(this.enPassant) : "-";
    return (
      `${rows.join("/")}` +
      ` ${this.turn}` +
      ` ${castling}` +
      ` ${ep}` +
      ` ${this.halfmoveClock}` +
      ` ${this.fullmoveNumber}`
    );
  }

  _coordsToAlgebraic({ r, c }) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  _algebraicToCoords(square) {
    const file = square[0].charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1], 10);
    return { r: rank, c: file };
  }

  getPiece(r, c) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return this.board[r][c];
  }

  makeMove(move) {
    const { from, to, promotion } = move;
    const piece = this.getPiece(from.r, from.c);
    if (!piece) return false;

    const snapshot = {
      board: this.board.map((row) => row.map((p) => (p ? { ...p } : null))),
      turn: this.turn,
      castling: { ...this.castling },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
    };

    const target = this.getPiece(to.r, to.c);
    const isCapture = !!target;
    const isPawn = piece.type === "p";

    // Halfmove clock
    if (isPawn || isCapture) this.halfmoveClock = 0;
    else this.halfmoveClock++;

    // Handle en passant capture
    if (
      isPawn &&
      this.enPassant &&
      to.r === this.enPassant.r &&
      to.c === this.enPassant.c &&
      !target
    ) {
      const dir = piece.color === "w" ? 1 : -1;
      this.board[to.r + dir][to.c] = null;
    }

    // Move piece
    this.board[to.r][to.c] = piece;
    this.board[from.r][from.c] = null;

    // Promotion
    if (isPawn && (to.r === 0 || to.r === 7)) {
      piece.type = promotion || "q";
    }

    // Set enPassant target
    this.enPassant = null;
    if (isPawn && Math.abs(to.r - from.r) === 2) {
      this.enPassant = { r: (to.r + from.r) / 2, c: to.c };
    }

    // Castling rights
    if (piece.type === "k") {
      if (piece.color === "w") {
        this.castling.K = false;
        this.castling.Q = false;
      } else {
        this.castling.k = false;
        this.castling.q = false;
      }
      // Castle move rook
      if (Math.abs(to.c - from.c) === 2) {
        const kingSide = to.c > from.c;
        const rookFrom = { r: from.r, c: kingSide ? 7 : 0 };
        const rookTo = { r: from.r, c: kingSide ? 5 : 3 };
        const rook = this.getPiece(rookFrom.r, rookFrom.c);
        this.board[rookTo.r][rookTo.c] = rook;
        this.board[rookFrom.r][rookFrom.c] = null;
      }
    }
    if (piece.type === "r") {
      if (piece.color === "w" && from.r === 7 && from.c === 0)
        this.castling.Q = false;
      if (piece.color === "w" && from.r === 7 && from.c === 7)
        this.castling.K = false;
      if (piece.color === "b" && from.r === 0 && from.c === 0)
        this.castling.q = false;
      if (piece.color === "b" && from.r === 0 && from.c === 7)
        this.castling.k = false;
    }

    // Fullmove
    if (this.turn === "b") this.fullmoveNumber++;
    this.turn = this.turn === "w" ? "b" : "w";

    this.history.push({ move: { ...move }, snapshot });
    return true;
  }

  undoMove() {
    const last = this.history.pop();
    if (!last) return false;
    const { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber } =
      last.snapshot;
    this.board = board.map((row) => row.map((p) => (p ? { ...p } : null)));
    this.turn = turn;
    this.castling = { ...castling };
    this.enPassant = enPassant ? { ...enPassant } : null;
    this.halfmoveClock = halfmoveClock;
    this.fullmoveNumber = fullmoveNumber;
    return true;
  }

  tryMove(move) {
    const engineClone = this.clone();
    if (!engineClone.makeMove(move)) return null;
    return engineClone;
  }

  clone() {
    const e = new ChessEngine();
    e.board = this.board.map((row) => row.map((p) => (p ? { ...p } : null)));
    e.turn = this.turn;
    e.castling = { ...this.castling };
    e.enPassant = this.enPassant ? { ...this.enPassant } : null;
    e.halfmoveClock = this.halfmoveClock;
    e.fullmoveNumber = this.fullmoveNumber;
    e.history = this.history.map((h) => ({
      move: { ...h.move },
      snapshot: {
        board: h.snapshot.board.map((row) =>
          row.map((p) => (p ? { ...p } : null))
        ),
        turn: h.snapshot.turn,
        castling: { ...h.snapshot.castling },
        enPassant: h.snapshot.enPassant ? { ...h.snapshot.enPassant } : null,
        halfmoveClock: h.snapshot.halfmoveClock,
        fullmoveNumber: h.snapshot.fullmoveNumber,
      },
    }));
    return e;
  }

  getLegalMoves(from) {
    const piece = this.getPiece(from.r, from.c);
    if (!piece || piece.color !== this.turn) return [];
    const moves = this.getPseudoLegalMoves(from);
    return moves.filter((m) => {
      const next = this.tryMove(m);
      return next && !next.isInCheck(piece.color);
    });
  }

  getAllLegalMoves(color = this.turn) {
    const list = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.color === color) {
          const ms = this.getPseudoLegalMoves({ r, c }).filter((m) => {
            const next = this.tryMove(m);
            return next && !next.isInCheck(color);
          });
          list.push(...ms);
        }
      }
    }
    return list;
  }

  isInCheck(color) {
    const kingPos = this._findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos, color === "w" ? "b" : "w");
  }

  isCheckmate(color = this.turn) {
    return this.isInCheck(color) && this.getAllLegalMoves(color).length === 0;
  }

  isStalemate(color = this.turn) {
    return !this.isInCheck(color) && this.getAllLegalMoves(color).length === 0;
  }

  isSquareAttacked(target, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.getPiece(r, c);
        if (!piece || piece.color !== byColor) continue;
        const moves = this.getPseudoLegalMoves({ r, c }, { ignoreTurn: true });
        if (moves.some((m) => m.to.r === target.r && m.to.c === target.c))
          return true;
      }
    }
    return false;
  }

  _findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (p && p.type === "k" && p.color === color) return { r, c };
      }
    }
    return null;
  }

  getPseudoLegalMoves(from, { ignoreTurn = false } = {}) {
    const piece = this.getPiece(from.r, from.c);
    if (!piece) return [];
    if (!ignoreTurn && piece.color !== this.turn) return [];
    const dir = piece.color === "w" ? -1 : 1;
    const moves = [];
    const push = (to, opts = {}) =>
      moves.push({ from, to, promotion: opts.promotion });

    const addSlide = (dr, dc) => {
      let r = from.r + dr;
      let c = from.c + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = this.getPiece(r, c);
        if (!target) {
          push({ r, c });
        } else {
          if (target.color !== piece.color) push({ r, c });
          break;
        }
        r += dr;
        c += dc;
      }
    };

    switch (piece.type) {
      case "p": {
        const fwd = { r: from.r + dir, c: from.c };
        if (!this.getPiece(fwd.r, fwd.c)) {
          push(fwd, { promotion: this._promotionIfAny(piece.color, fwd.r) });
          const startRow = piece.color === "w" ? 6 : 1;
          if (from.r === startRow) {
            const dbl = { r: from.r + dir * 2, c: from.c };
            if (!this.getPiece(dbl.r, dbl.c)) push(dbl);
          }
        }
        for (const dc of [-1, 1]) {
          const tr = from.r + dir;
          const tc = from.c + dc;
          const target = this.getPiece(tr, tc);
          if (target && target.color !== piece.color) {
            push(
              { r: tr, c: tc },
              { promotion: this._promotionIfAny(piece.color, tr) }
            );
          }
          if (
            this.enPassant &&
            this.enPassant.r === tr &&
            this.enPassant.c === tc
          ) {
            push({ r: tr, c: tc });
          }
        }
        break;
      }
      case "n": {
        const steps = [
          [2, 1],
          [2, -1],
          [-2, 1],
          [-2, -1],
          [1, 2],
          [1, -2],
          [-1, 2],
          [-1, -2],
        ];
        for (const [dr, dc] of steps) {
          const r = from.r + dr;
          const c = from.c + dc;
          if (r < 0 || r > 7 || c < 0 || c > 7) continue;
          const target = this.getPiece(r, c);
          if (!target || target.color !== piece.color) push({ r, c });
        }
        break;
      }
      case "b":
        addSlide(1, 1);
        addSlide(1, -1);
        addSlide(-1, 1);
        addSlide(-1, -1);
        break;
      case "r":
        addSlide(1, 0);
        addSlide(-1, 0);
        addSlide(0, 1);
        addSlide(0, -1);
        break;
      case "q":
        addSlide(1, 0);
        addSlide(-1, 0);
        addSlide(0, 1);
        addSlide(0, -1);
        addSlide(1, 1);
        addSlide(1, -1);
        addSlide(-1, 1);
        addSlide(-1, -1);
        break;
      case "k": {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = from.r + dr;
            const c = from.c + dc;
            if (r < 0 || r > 7 || c < 0 || c > 7) continue;
            const target = this.getPiece(r, c);
            if (!target || target.color !== piece.color) push({ r, c });
          }
        }
        // Castling
        if (!ignoreTurn && !this.isInCheck(piece.color)) {
          const back = piece.color === "w" ? 7 : 0;
          // King side
          if (
            (piece.color === "w" && this.castling.K) ||
            (piece.color === "b" && this.castling.k)
          ) {
            if (!this.getPiece(back, 5) && !this.getPiece(back, 6)) {
              const safe =
                !this.isSquareAttacked(
                  { r: back, c: 5 },
                  piece.color === "w" ? "b" : "w"
                ) &&
                !this.isSquareAttacked(
                  { r: back, c: 6 },
                  piece.color === "w" ? "b" : "w"
                );
              if (safe) push({ r: back, c: 6 });
            }
          }
          // Queen side
          if (
            (piece.color === "w" && this.castling.Q) ||
            (piece.color === "b" && this.castling.q)
          ) {
            if (
              !this.getPiece(back, 1) &&
              !this.getPiece(back, 2) &&
              !this.getPiece(back, 3)
            ) {
              const safe =
                !this.isSquareAttacked(
                  { r: back, c: 2 },
                  piece.color === "w" ? "b" : "w"
                ) &&
                !this.isSquareAttacked(
                  { r: back, c: 3 },
                  piece.color === "w" ? "b" : "w"
                );
              if (safe) push({ r: back, c: 2 });
            }
          }
        }
        break;
      }
    }
    return moves;
  }

  _promotionIfAny(color, row) {
    return (color === "w" && row === 0) || (color === "b" && row === 7)
      ? "q"
      : null;
  }

  evaluate() {
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.getPiece(r, c);
        if (!p) continue;
        const val = pieceValues[p.type] || 0;
        score += p.color === "w" ? val : -val;
      }
    }
    return score;
  }
}

window.ChessEngine = ChessEngine;

