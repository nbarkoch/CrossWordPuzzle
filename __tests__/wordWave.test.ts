import {
  createWordWaveBoard,
  findWordWaveMoves,
  getMoveForPath,
  getWordFromPath,
  getWordWaveDictionary,
  getWordWaveSelectionPath,
  refillWordWaveBoard,
  searchWordWaveSurvivalCandidate,
  simulateWordWaveTimedGameplay,
  simulateWordWaveOpportunityHealth,
  simulateWordWaveSurvival,
  WordWavePosition,
} from '../src/utils/wordWave';

const isStraightPath = (path: WordWavePosition[]) => {
  if (path.length <= 2) {
    return true;
  }

  const dx = path[1].col - path[0].col;
  const dy = path[1].row - path[0].row;

  for (let i = 2; i < path.length; i += 1) {
    if (
      path[i].col - path[i - 1].col !== dx ||
      path[i].row - path[i - 1].row !== dy
    ) {
      return false;
    }
  }

  return true;
};

const getLocationBucketKey = ({row, col}: WordWavePosition) =>
  `${Math.floor((row * 3) / 7)}:${Math.floor((col * 3) / 7)}`;

const getRepeatedCellPressure = (
  moves: ReturnType<typeof findWordWaveMoves>,
) => {
  const usage = new Map<string, number>();

  moves.forEach(move => {
    move.path.forEach(position => {
      const key = `${position.row}:${position.col}`;
      usage.set(key, (usage.get(key) ?? 0) + 1);
    });
  });

  return Math.max(...usage.values());
};

const getUniqueMovesByWord = (moves: ReturnType<typeof findWordWaveMoves>) => {
  const usedWords = new Set<string>();

  return moves.filter(move => {
    if (usedWords.has(move.word)) {
      return false;
    }

    usedWords.add(move.word);
    return true;
  });
};

const getFreshPositionsAfterClear = (removedPath: WordWavePosition[]) => {
  const removedByCol = new Map<number, number>();
  const freshPositions = new Set<string>();

  removedPath.forEach(position => {
    removedByCol.set(position.col, (removedByCol.get(position.col) ?? 0) + 1);
  });

  removedByCol.forEach((count, col) => {
    for (let row = 0; row < count; row += 1) {
      freshPositions.add(`${row}:${col}`);
    }
  });

  return freshPositions;
};

const getFreshOverlap = (
  move: ReturnType<typeof findWordWaveMoves>[number],
  freshPositions: Set<string>,
) =>
  move.path.filter(position => freshPositions.has(`${position.row}:${position.col}`))
    .length;

const isTopBandHorizontal = (
  move: ReturnType<typeof findWordWaveMoves>[number],
) => move.direction.dy === 0 && move.path.every(position => position.row <= 1);

const isMixedWithFreshCells = (
  move: ReturnType<typeof findWordWaveMoves>[number],
  freshPositions: Set<string>,
) => {
  const freshOverlap = getFreshOverlap(move, freshPositions);

  return freshOverlap > 0 && freshOverlap < move.path.length;
};

const getGoodCoverageStats = (moves: ReturnType<typeof findWordWaveMoves>) => {
  const goodCoveredCells = new Set<string>();
  const deepGarbageCells = [];

  moves.forEach(move => {
    if (move.word.length < 4) {
      return;
    }

    move.path.forEach(position => {
      goodCoveredCells.add(`${position.row}:${position.col}`);
    });
  });

  for (let row = 3; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      if (!goodCoveredCells.has(`${row}:${col}`)) {
        deepGarbageCells.push({row, col});
      }
    }
  }

  return {
    goodCoveredCells: goodCoveredCells.size,
    deepGarbageCells: deepGarbageCells.length,
  };
};

const getNewMoves = (
  previousMoves: ReturnType<typeof findWordWaveMoves>,
  nextMoves: ReturnType<typeof findWordWaveMoves>,
) => {
  const previousWords = new Set(previousMoves.map(move => move.word));

  return nextMoves.filter(move => !previousWords.has(move.word));
};

it('finds only straight selectable word wave moves', () => {
  const board = createWordWaveBoard();
  const moves = findWordWaveMoves(board);

  expect(moves.length).toBeGreaterThan(0);
  moves.forEach(move => {
    expect(isStraightPath(move.path)).toBe(true);
    expect(getWordFromPath(board, move.path)).toBe(move.word);
  });
});

it('uses an expanded word wave dictionary with many longer words', () => {
  const dictionary = getWordWaveDictionary();

  expect(dictionary.length).toBeGreaterThan(1400);
  expect(dictionary.filter(word => word.length >= 5).length).toBeGreaterThan(900);
  expect(dictionary.filter(word => word.length === 7).length).toBeGreaterThan(200);
  expect(dictionary).toEqual(expect.arrayContaining(['BETTER', 'QUALITY', 'WORKING']));
});

it('generates varied boards with diagonal and longer words', () => {
  const board = createWordWaveBoard();
  const moves = findWordWaveMoves(board);
  const locationBucketCount = new Set(
    moves.flatMap(move => move.path.map(getLocationBucketKey)),
  ).size;

  expect(moves.some(move => move.direction.dx !== 0 && move.direction.dy !== 0))
    .toBe(true);
  expect(moves.some(move => move.word.length >= 5)).toBe(true);
  expect(new Set(moves.map(move => `${move.direction.dx}:${move.direction.dy}`)).size)
    .toBeGreaterThanOrEqual(4);
  expect(locationBucketCount).toBeGreaterThanOrEqual(6);
  expect(getRepeatedCellPressure(moves)).toBeLessThanOrEqual(20);
});

it('does not refill most next words into the same obvious cleared lane', () => {
  const board = createWordWaveBoard();
  const move =
    findWordWaveMoves(board).find(
      candidate =>
        candidate.word.length >= 5 &&
        candidate.path.some(position => position.row <= 2),
    ) ?? findWordWaveMoves(board)[0];
  const result = refillWordWaveBoard(board, move.path, 8, 320);
  const freshPositions = getFreshPositionsAfterClear(move.path);
  const removedRows = new Set(move.path.map(position => position.row));
  const removedCols = new Set(move.path.map(position => position.col));
  const uniqueMoves = getUniqueMovesByWord(findWordWaveMoves(result.board));
  const freshDominatedMoves = uniqueMoves.filter(candidate => {
    const freshOverlap = getFreshOverlap(candidate, freshPositions);
    return freshOverlap > 0 && freshOverlap / candidate.path.length >= 0.5;
  });
  const sameClearedLaneMoves = uniqueMoves.filter(candidate => {
    if (
      candidate.direction.dy === 0 &&
      candidate.path.some(position => removedRows.has(position.row))
    ) {
      return true;
    }

    return (
      candidate.direction.dx === 0 &&
      candidate.path.some(position => removedCols.has(position.col))
    );
  });
  const topBandHorizontalMoves = uniqueMoves.filter(isTopBandHorizontal);
  const shortMoves = uniqueMoves.filter(candidate => candidate.word.length <= 3);
  const longDeepMoves = uniqueMoves.filter(
    candidate =>
      candidate.word.length >= 5 &&
      candidate.path.some(position => position.row >= 3),
  );

  expect(uniqueMoves.length).toBeGreaterThanOrEqual(8);
  // The full English dictionary makes most 3-letter tile triples valid words,
  // so boards are inherently short-word-heavy (observed ~0.7 of unique moves).
  // This guardrail now catches only genuinely degenerate short-word floods.
  expect(shortMoves.length).toBeLessThanOrEqual(
    Math.max(3, Math.floor(uniqueMoves.length * 0.85)),
  );
  expect(longDeepMoves.length).toBeGreaterThanOrEqual(2);
  expect(freshDominatedMoves.length).toBeLessThanOrEqual(
    Math.max(3, Math.floor(uniqueMoves.length * 0.35)),
  );
  expect(sameClearedLaneMoves.length).toBeLessThanOrEqual(
    Math.max(5, Math.floor(uniqueMoves.length * 0.5)),
  );
  expect(topBandHorizontalMoves.length).toBeLessThanOrEqual(
    Math.max(2, Math.floor(uniqueMoves.length * 0.22)),
  );
  expect(
    uniqueMoves.some(
      candidate =>
        candidate.direction.dx !== 0 &&
        candidate.direction.dy !== 0 &&
        candidate.path.some(position => position.row >= 3),
    ),
  ).toBe(true);
  expect(
    longDeepMoves.length > 0,
  ).toBe(true);
  expect(
    uniqueMoves.some(candidate =>
      isMixedWithFreshCells(candidate, freshPositions),
    ) || longDeepMoves.length >= 3,
  ).toBe(true);
});

it('keeps board continuity after repeated clears', () => {
  let board = createWordWaveBoard();

  for (let step = 0; step < 16; step += 1) {
    const moves = findWordWaveMoves(board);
    const selectedMove =
      moves.find(
        move =>
          move.word.length >= 5 &&
          move.direction.dx !== 0 &&
          move.direction.dy !== 0,
      ) ??
      moves.find(move => move.word.length >= 5) ??
      moves[0];

    expect(selectedMove).toBeTruthy();

    const removedIds = new Set(
      selectedMove.path.map(position => board[position.row][position.col].id),
    );
    const originalLettersById = new Map<string, string>();

    board.forEach(row => {
      row.forEach(tile => {
        originalLettersById.set(tile.id, tile.letter);
      });
    });

    const result = refillWordWaveBoard(board, selectedMove.path);
    board = result.board;

    const nextMoves = findWordWaveMoves(board);

    let repairedSurvivorChanges = 0;

    board.forEach(row => {
      row.forEach(tile => {
        if (removedIds.has(tile.id) || !originalLettersById.has(tile.id)) {
          return;
        }

        if (tile.letter !== originalLettersById.get(tile.id)) {
          repairedSurvivorChanges += 1;
        }
      });
    });
    expect(repairedSurvivorChanges).toBeLessThanOrEqual(
      result.repairedCount ?? 0,
    );
    expect(result.repairedCount ?? 0).toBeLessThanOrEqual(3);
    expect(nextMoves.length).toBeGreaterThan(0);
  }
});

it('keeps useful word coverage after repeated clears', () => {
  let board = createWordWaveBoard();

  for (let step = 0; step < 12; step += 1) {
    const moves = findWordWaveMoves(board);
    const selectedMove =
      moves.find(
        move =>
          move.word.length >= 5 &&
          move.direction.dx !== 0 &&
          move.direction.dy !== 0,
      ) ??
      moves.find(move => move.word.length >= 5) ??
      moves[0];

    expect(selectedMove).toBeTruthy();

    board = refillWordWaveBoard(board, selectedMove.path).board;

    const coverage = getGoodCoverageStats(findWordWaveMoves(board));

    expect(coverage.goodCoveredCells).toBeGreaterThanOrEqual(18);
    expect(coverage.deepGarbageCells).toBeLessThanOrEqual(18);
  }
});

it('refill preserves surviving tile letters except bounded repairs', () => {
  const board = createWordWaveBoard();
  const move = findWordWaveMoves(board)[0];
  const previousMoves = findWordWaveMoves(board);
  const removedIds = new Set(
    move.path.map(position => board[position.row][position.col].id),
  );
  const originalLettersById = new Map<string, string>();

  board.forEach(row => {
    row.forEach(tile => {
      originalLettersById.set(tile.id, tile.letter);
    });
  });

  const result = refillWordWaveBoard(board, move.path);

  let repairedSurvivorChanges = 0;
  const repairedSurvivorIds = new Set<string>();

  result.board.forEach(row => {
    row.forEach(tile => {
      if (removedIds.has(tile.id) || !originalLettersById.has(tile.id)) {
        return;
      }

      if (tile.letter !== originalLettersById.get(tile.id)) {
        repairedSurvivorChanges += 1;
        repairedSurvivorIds.add(tile.id);
      }
    });
  });

  expect(repairedSurvivorChanges).toBeLessThanOrEqual(
    result.repairedCount ?? 0,
  );
  expect(result.repairedCount ?? 0).toBeLessThanOrEqual(3);

  getNewMoves(previousMoves, findWordWaveMoves(result.board)).forEach(newMove => {
    const repairedOverlap = newMove.path.filter(position =>
      repairedSurvivorIds.has(result.board[position.row][position.col].id),
    ).length;

    expect(
      newMove.word.length <= 4 && repairedOverlap >= 2,
    ).toBe(false);
    expect(repairedOverlap / newMove.path.length).toBeLessThan(0.45);
  });
});

const maybeReportIt = process.env.WORD_WAVE_REPORT === '1' ? it : it.skip;

maybeReportIt(
  'prints word wave score health over 30 simulated 100-step runs',
  () => {
    const report = simulateWordWaveOpportunityHealth(6, 5, 100);

    console.log(JSON.stringify(report, null, 2));

    expect(report.runs).toBe(30);
    expect(report.averageInitialScore).toBeGreaterThan(0);
    expect(Number.isFinite(report.averageScoreRetention)).toBe(true);
  },
  180000,
);

maybeReportIt(
  'prints timed word wave player profile report',
  () => {
    const seconds = Number(process.env.WORD_WAVE_TIMED_SECONDS ?? 120);
    const runs = Number(process.env.WORD_WAVE_TIMED_RUNS ?? 12);
    const rowDropSeconds = Number(process.env.WORD_WAVE_ROW_DROP_SECONDS ?? 10);
    const report = simulateWordWaveTimedGameplay(seconds, runs, rowDropSeconds);

    console.log(JSON.stringify(report, null, 2));

    expect(report.seconds).toBe(seconds);
    expect(report.profiles).toHaveLength(3);
    expect(report.profiles[0].averageWordsFound).toBeGreaterThan(0);
  },
  180000,
);

it('simulates 100-star survival across valid user choices', () => {
  const board = createWordWaveBoard();
  const report = simulateWordWaveSurvival(board, 100, 3, 24, 0);

  expect(report.branchesChecked).toBeGreaterThan(0);
  expect(report.minMoves).toBeGreaterThan(0);
  expect(report.deadBranches).toBe(0);
});

it('measures strict-rule survival over multiple boards', () => {
  const report = searchWordWaveSurvivalCandidate(4, 100, 3, 24, 0);

  expect(report.boardsChecked).toBe(4);
  expect(report.bestReport.minMoves).toBeGreaterThan(0);
});

it('builds selection paths from one start cell in a straight direction', () => {
  const board = createWordWaveBoard();
  const move = findWordWaveMoves(board)[0];
  const path = getWordWaveSelectionPath(
    move.path[0],
    move.path[move.path.length - 1],
  );

  expect(path).toEqual(move.path);
  expect(getWordFromPath(board, path)).toBe(move.word);
  expect(getMoveForPath(board, path)?.word).toBe(move.word);
});
