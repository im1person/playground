// Simple puzzle collection
window.CHESS_PUZZLES = [
  {
    name: 'Mate in 1 (Back Rank)',
    fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    solution: [{ from: 'g2', to: 'g3' }, { from: 'g3', to: 'g8' }], // illustrative
  },
  {
    name: 'Scholar Mate Defense',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
    solution: [{ from: 'd8', to: 'f6' }],
  },
  {
    name: 'Mate in 2',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: [
      { from: 'c4', to: 'f7' },
      { from: 'e5', to: 'e5' }, // placeholder second move to keep array length
    ],
  },
];

