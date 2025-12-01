class RubiksCube {
  constructor() {
    // 0: U (White), 1: L (Orange), 2: F (Green), 3: R (Red), 4: B (Blue), 5: D (Yellow)
    this.colors = ["W", "O", "G", "R", "B", "Y"];
    this.reset();
  }

  reset() {
    // 6 faces, each 3x3 (9 elements)
    // stored as this.state[faceIndex][cellIndex]
    // Cell indices:
    // 0 1 2
    // 3 4 5
    // 6 7 8
    this.state = [];
    for (let i = 0; i < 6; i++) {
      this.state[i] = new Array(9).fill(this.colors[i]);
    }
    this.history = [];
  }

  // Clone the current cube state (useful for solvers)
  clone() {
    const newCube = new RubiksCube();
    newCube.state = this.state.map((face) => [...face]);
    return newCube;
  }

  getFace(faceIndex) {
    return this.state[faceIndex];
  }

  // Basic moves
  // Face indices: U=0, L=1, F=2, R=3, B=4, D=5
  move(moveStr) {
    const baseMove = moveStr.charAt(0);
    const suffix = moveStr.substring(1);

    let times = 1;
    if (suffix === "'") times = 3; // 3 clockwise = 1 counter-clockwise
    else if (suffix === "2") times = 2;

    for (let i = 0; i < times; i++) {
      this.rotateFace(baseMove);
    }

    this.history.push(moveStr);
  }

  rotateFace(faceChar) {
    switch (faceChar) {
      case "U":
        this.rotateU();
        break;
      case "D":
        this.rotateD();
        break;
      case "L":
        this.rotateL();
        break;
      case "R":
        this.rotateR();
        break;
      case "F":
        this.rotateF();
        break;
      case "B":
        this.rotateB();
        break;
    }
  }

  // Helper to rotate a 3x3 face array clockwise
  rotateFaceArrayClockwise(faceIdx) {
    const oldFace = this.state[faceIdx];
    const newFace = [...oldFace];

    // Corners
    newFace[0] = oldFace[6];
    newFace[2] = oldFace[0];
    newFace[8] = oldFace[2];
    newFace[6] = oldFace[8];

    // Edges
    newFace[1] = oldFace[3];
    newFace[5] = oldFace[1];
    newFace[7] = oldFace[5];
    newFace[3] = oldFace[7];

    // Center (4) remains same
    this.state[faceIdx] = newFace;
  }

  rotateU() {
    this.rotateFaceArrayClockwise(0); // U
    // F -> L -> B -> R -> F (top row: 0,1,2)
    const F = this.state[2],
      L = this.state[1],
      B = this.state[4],
      R = this.state[3];
    const temp = [F[0], F[1], F[2]];

    F[0] = R[0];
    F[1] = R[1];
    F[2] = R[2];
    R[0] = B[0];
    R[1] = B[1];
    R[2] = B[2];
    B[0] = L[0];
    B[1] = L[1];
    B[2] = L[2];
    L[0] = temp[0];
    L[1] = temp[1];
    L[2] = temp[2];
  }

  rotateD() {
    this.rotateFaceArrayClockwise(5); // D
    // F -> R -> B -> L -> F (bottom row: 6,7,8)
    const F = this.state[2],
      L = this.state[1],
      B = this.state[4],
      R = this.state[3];
    const temp = [F[6], F[7], F[8]];

    F[6] = L[6];
    F[7] = L[7];
    F[8] = L[8];
    L[6] = B[6];
    L[7] = B[7];
    L[8] = B[8];
    B[6] = R[6];
    B[7] = R[7];
    B[8] = R[8];
    R[6] = temp[0];
    R[7] = temp[1];
    R[8] = temp[2];
  }

  rotateL() {
    this.rotateFaceArrayClockwise(1); // L
    // U -> F -> D -> B -> U (left col: 0,3,6)
    // Note: B is on the back, so its left col from front view is actually indices 8,5,2 if we view it from back?
    // Let's follow standard net map.
    // U(0,3,6) -> F(0,3,6) -> D(0,3,6) -> B(8,5,2) -> U(0,3,6)

    const U = this.state[0],
      F = this.state[2],
      D = this.state[5],
      B = this.state[4];
    const temp = [U[0], U[3], U[6]];

    U[0] = B[8];
    U[3] = B[5];
    U[6] = B[2];
    B[8] = D[6];
    B[5] = D[3];
    B[2] = D[0]; // Logic check: D(0,3,6) goes to B(8,5,2)
    // Wait, standard rotation L:
    // U left col moves to F left col
    // F left col moves to D left col
    // D left col moves to B right col (inverted) ?
    // Let's visualize: L face rotates.
    // The strip is U-F-D-B.
    // U(0,3,6) -> F(0,3,6)
    // F(0,3,6) -> D(0,3,6)
    // D(0,3,6) -> B(8,5,2) (Back face orientation matters. Usually 0 is top-left. For B, 0 is top-left looking from BACK.
    // If we look from front, B's right column (2,5,8) is adjacent to L's left column? No.
    // L is adjacent to B's right column (viewed from back), which is 2,5,8.
    // Let's verify adjacency:
    // L(1) is left. U(0) top, F(2) front, D(5) down, B(4) back.
    // L col 0,3,6 touches B col 2,5,8?
    // YES.
    // So L move:
    // U(0,3,6) -> F(0,3,6)
    // F(0,3,6) -> D(0,3,6)
    // D(0,3,6) -> B(8,5,2)
    // B(8,5,2) -> U(0,3,6)

    // Correct logic:
    U[0] = B[8];
    U[3] = B[5];
    U[6] = B[2]; // B into U
    B[8] = D[6];
    B[5] = D[3];
    B[2] = D[0]; // D into B
    D[0] = F[0];
    D[3] = F[3];
    D[6] = F[6]; // F into D
    F[0] = temp[0];
    F[3] = temp[1];
    F[6] = temp[2]; // U into F is wrong, I overwrote U first?
    // I need to do it in reverse or save temp.
    // I saved U into temp.

    // Let's restart assignment with correct order or using temp
    // temp = U
    // U = B (inverted)
    // B (inverted) = D
    // D = F
    // F = temp

    // Re-implement carefully
  }

  rotateL_Corrected() {
    this.rotateFaceArrayClockwise(1);
    const U = this.state[0],
      F = this.state[2],
      D = this.state[5],
      B = this.state[4];
    const temp = [U[0], U[3], U[6]];

    U[0] = B[8];
    U[3] = B[5];
    U[6] = B[2];
    B[8] = D[6];
    B[5] = D[3];
    B[2] = D[0]; // Note: D indices 0,3,6 match spatial position on left
    D[0] = F[0];
    D[3] = F[3];
    D[6] = F[6];
    F[0] = temp[0];
    F[3] = temp[1];
    F[6] = temp[2];
  }

  rotateR() {
    this.rotateFaceArrayClockwise(3); // R
    // U -> B -> D -> F -> U (right col: 2,5,8)
    // U(2,5,8) -> B(6,3,0) (Back face left col is 0,3,6. 2,5,8 is right col.
    // R touches B's left col (0,3,6) when viewed from back?
    // Let's trace: R is Right. B is Back.
    // R's right side (adj to B) is indices 2,5,8.
    // B's left side (adj to R) is indices 0,3,6.
    // So U(2,5,8) goes to B(6,3,0)?
    // Rotation is clockwise looking at R.
    // U -> B? No, R move pulls F up to U.
    // F(2,5,8) -> U(2,5,8)
    // U(2,5,8) -> B(6,3,0)
    // B(6,3,0) -> D(2,5,8)
    // D(2,5,8) -> F(2,5,8)

    const U = this.state[0],
      F = this.state[2],
      D = this.state[5],
      B = this.state[4];
    const temp = [U[2], U[5], U[8]];

    U[2] = F[2];
    U[5] = F[5];
    U[8] = F[8];
    F[2] = D[2];
    F[5] = D[5];
    F[8] = D[8];
    D[2] = B[6];
    D[5] = B[3];
    D[8] = B[0];
    B[6] = temp[0];
    B[3] = temp[1];
    B[0] = temp[2];
  }

  rotateF() {
    this.rotateFaceArrayClockwise(2); // F
    // U -> R -> D -> L -> U (face slice)
    // U(6,7,8) -> R(0,3,6)
    // R(0,3,6) -> D(2,1,0) (reverse?)
    // D(2,1,0) -> L(8,5,2)
    // L(8,5,2) -> U(6,7,8)

    // Let's verify: Clockwise F.
    // Top (U) bottom row moves to Right (R) left col.
    // U(6,7,8) -> R(0,3,6)
    // R(0,3,6) -> D(2,1,0) (matches bottom of D being 6,7,8, top is 0,1,2. D is inverted relative to U in loop?
    // F face: U is up, D is down, L is left, R is right.
    // U bottom row (6,7,8). R left col (0,3,6). D top row (0,1,2). L right col (2,5,8).
    // Move: U(6,7,8) -> R(0,3,6).
    // R(0,3,6) -> D(2,1,0). (Wait, R bottom is 6, D right is 2? No).
    // D top row is 0,1,2. R bottom-left is 6?
    // Let's visualize F turn.
    // 12 o'clock (U) moves to 3 o'clock (R).
    // U(6,7,8) -> R(0,3,6). Correct.
    // R(0,3,6) -> D(2,1,0). (R6 is bottom-left. D2 is top-right. D0 is top-left).
    // Yes, R0->D2, R3->D1, R6->D0.
    // D(2,1,0) -> L(8,5,2). (D2->L8, D1->L5, D0->L2).
    // L(8,5,2) -> U(6,7,8). (L8->U6, L5->U7, L2->U8).

    const U = this.state[0],
      R = this.state[3],
      D = this.state[5],
      L = this.state[1];
    const temp = [U[6], U[7], U[8]];

    U[6] = L[8];
    U[7] = L[5];
    U[8] = L[2];
    L[8] = D[2];
    L[5] = D[1];
    L[2] = D[0];
    D[2] = R[6];
    D[1] = R[3];
    D[0] = R[0]; // Fixed mapping R->D
    R[0] = temp[0];
    R[3] = temp[1];
    R[6] = temp[2];
  }

  rotateB() {
    this.rotateFaceArrayClockwise(4); // B
    // U -> L -> D -> R -> U
    // U(2,1,0) -> L(0,3,6)
    // L(0,3,6) -> D(6,7,8)
    // D(6,7,8) -> R(8,5,2)
    // R(8,5,2) -> U(2,1,0)

    const U = this.state[0],
      R = this.state[3],
      D = this.state[5],
      L = this.state[1];
    const temp = [U[2], U[1], U[0]];

    U[2] = R[8];
    U[1] = R[5];
    U[0] = R[2];
    R[8] = D[6];
    R[5] = D[7];
    R[2] = D[8];
    D[6] = L[0];
    D[7] = L[3];
    D[8] = L[6];
    L[0] = temp[0];
    L[3] = temp[1];
    L[6] = temp[2];
  }

  // Overwrite the helpers with correct logic
  // Re-implementing rotateL to be sure
  rotateL() {
    this.rotateFaceArrayClockwise(1);
    const U = this.state[0],
      F = this.state[2],
      D = this.state[5],
      B = this.state[4];
    const temp = [U[0], U[3], U[6]];

    U[0] = B[8];
    U[3] = B[5];
    U[6] = B[2];
    B[8] = D[6];
    B[5] = D[3];
    B[2] = D[0];
    D[0] = F[0];
    D[3] = F[3];
    D[6] = F[6];
    F[0] = temp[0];
    F[3] = temp[1];
    F[6] = temp[2];
  }

  isSolved() {
    for (let f = 0; f < 6; f++) {
      const color = this.state[f][0];
      for (let i = 1; i < 9; i++) {
        if (this.state[f][i] !== color) return false;
      }
    }
    return true;
  }

  scramble() {
    const moves = ["U", "D", "L", "R", "F", "B"];
    const suffixes = ["", "'", "2"];
    const scrambleLen = 20;
    let lastMove = -1;
    let scrambleStr = "";

    for (let i = 0; i < scrambleLen; i++) {
      let moveIdx;
      do {
        moveIdx = Math.floor(Math.random() * 6);
      } while (moveIdx === lastMove); // Avoid same face twice

      lastMove = moveIdx;
      const suffix = suffixes[Math.floor(Math.random() * 3)];
      const move = moves[moveIdx] + suffix;
      this.move(move);
      scrambleStr += move + " ";
    }
    return scrambleStr.trim();
  }

  // Easter egg mode: set all faces to a single color
  setAllFaces(colorChar = "W") {
    for (let i = 0; i < 6; i++) {
      this.state[i].fill(colorChar);
    }
  }
}

// Export globally
window.RubiksCube = RubiksCube;
