export const puzzleData = {
  easy: [
    {
      id: "easy-1",
      grid: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution:
        "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    },
  ],
  normal: [
    {
      id: "normal-1",
      grid: "003020600900305001001806400008102900700000008006708200002609500800203009005010300",
      solution:
        "483921657967345821251876493548132976729564138136798245372689514814253769695417382",
    },
  ],
  hard: [
    {
      id: "hard-1",
      grid: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
      solution:
        "462831957795426183381795426173984265659312748248567319926178534834259671517643892",
    },
  ],
  master: [
    {
      id: "master-1",
      grid: "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
      solution:
        "812753649943682175675491283154237896369845721287169534521974368438526917796318452",
    },
  ],
};

export function parsePuzzle(entry, fallbackId) {
  if (!entry?.grid || !entry?.solution) {
    throw new Error(
      `Puzzle ${entry?.id ?? fallbackId} is missing grid/solution`
    );
  }

  const serialize = (text) => {
    if (text.length !== 81) {
      throw new Error(`Puzzle ${entry.id ?? fallbackId} must be 81 chars long`);
    }
    return text.split("").map((digit, idx) => {
      const value = Number(digit);
      if (Number.isNaN(value) || value < 0 || value > 9) {
        throw new Error(
          `Puzzle ${
            entry.id ?? fallbackId
          } has invalid digit "${digit}" at position ${idx}`
        );
      }
      return value;
    });
  };

  return {
    id: entry.id ?? fallbackId,
    grid: serialize(entry.grid),
    solution: serialize(entry.solution),
  };
}

export function getParsedPuzzles() {
  return Object.fromEntries(
    Object.entries(puzzleData).map(([difficulty, list]) => [
      difficulty,
      list.map((entry, index) =>
        parsePuzzle(entry, `${difficulty}-${index + 1}`)
      ),
    ])
  );
}
