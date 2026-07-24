import {WORD_WAVE_COMMON_WORDS} from '~/data/wordWaveWords';

export const WORD_WAVE_SIZE = 7;
export const WORD_WAVE_MIN_WORD_LENGTH = 3;
const WORD_WAVE_PLANNED_MIN_WORD_LENGTH = 4;
const WORD_WAVE_PLAYABLE_MIN_WORD_LENGTH = 4;
const WORD_WAVE_PLAYABLE_MAX_WORD_LENGTH = 6;

export type WordWaveTile = {
  id: string;
  letter: string;
};

export type WordWaveBoard = WordWaveTile[][];

export type WordWavePosition = {
  row: number;
  col: number;
};

export type WordWaveMove = {
  word: string;
  path: WordWavePosition[];
  direction: WordWaveDirection;
};

export type WordWaveRefillResult = {
  board: WordWaveBoard;
  moves: WordWaveMove[];
  attempts: number;
  injectedWord?: string;
  repairedCount?: number;
};

export type WordWaveSurvivalReport = {
  survives: boolean;
  branchesChecked: number;
  branchBudgetHit: boolean;
  deadBranches: number;
  minMoves: number;
  minUniqueWords: number;
  minLongestWord: number;
  minDirectionCount: number;
  worstPath: string[];
};

export type WordWaveCandidateSearchReport = {
  boardsChecked: number;
  survivedBoards: number;
  bestReport: WordWaveSurvivalReport;
};

export type WordWaveOpportunityReport = {
  runs: number;
  stepsPerRun: number;
  successCount: number;
  failureCount: number;
  averageInitialScore: number;
  averageFinalScore: number;
  averageMinScore: number;
  averageScoreRetention: number;
  averageInitialOpportunities: number;
  averageFinalOpportunities: number;
  averageMinOpportunities: number;
  averageFinalGoodCoverage: number;
  averageMinGoodCoverage: number;
  averageRepairs: number;
  failures: Array<{
    run: number;
    step: number;
    initialScore: number;
    score: number;
    minScore: number;
    scoreRetention: number;
    opportunities: number;
    goodCoverage: number;
    deepGarbage: number;
  }>;
};

export type WordWaveTimedPlayerLevel = 'bad' | 'medium' | 'good';

export type WordWaveTimedSimulationReport = {
  seconds: number;
  runsPerPlayer: number;
  rowDropSeconds: number;
  profiles: Array<{
    level: WordWaveTimedPlayerLevel;
    successCount: number;
    failureCount: number;
    averageInitialScore: number;
    averageFinalScore: number;
    averageMinScore: number;
    averageScoreRetention: number;
    averageWordsFound: number;
    averageWordLength: number;
    averageLongWordsFound: number;
    averageRowDrops: number;
    averageRepairSwitches: number;
    averageLetterPressureScore: number;
    averageArcadeScore: number;
  }>;
};

export type WordWaveTimedWordResult = {
  board: WordWaveBoard;
  repairedCount: number;
  pressureScore: number;
  arcadeScore: number;
};

export type WordWaveTimedSelectionResult = WordWaveTimedWordResult & {
  refillAttempts: number;
};

type BoardSlot = WordWaveTile | null;
type BoardSlots = BoardSlot[][];
type WordWaveScoreContext = {
  freshPositions?: Set<string>;
  removedRows?: Set<number>;
  removedCols?: Set<number>;
};
type ScoredWordWaveCandidate = {
  board: WordWaveBoard;
  quality: ReturnType<typeof scoreWordWaveBoard>;
};
type WordWaveInjectionOption = {
  word: string;
  path: WordWavePosition[];
  score: number;
};
export type WordWaveDirection = {
  dx: number;
  dy: number;
};

const WORD_WAVE_DIRECTIONS: WordWaveDirection[] = [
  {dx: 0, dy: -1},
  {dx: 1, dy: -1},
  {dx: 1, dy: 0},
  {dx: 1, dy: 1},
  {dx: 0, dy: 1},
  {dx: -1, dy: 1},
  {dx: -1, dy: 0},
  {dx: -1, dy: -1},
];

const normalizeWord = (word: string) => word.replace(/[^a-z]/gi, '').toUpperCase();

const toWordBank = (words: string[]) =>
  Array.from(
    new Set(
      words.map(normalizeWord).filter(
        word =>
          word.length >= WORD_WAVE_MIN_WORD_LENGTH &&
          word.length <= WORD_WAVE_SIZE,
      ),
    ),
  );

const WORD_WAVE_AWKWARD_WORDS = new Set([
  'ABBA',
  'AGAS',
  'GAGA',
  'HAGS',
  'JEFE',
  'JEFES',
  'SAES',
  'SHAG',
  'SHAGS',
  'TATE',
  'THANE',
]);

const isPlayableWordWaveWord = (word: string) =>
  word.length >= WORD_WAVE_PLAYABLE_MIN_WORD_LENGTH &&
  word.length <= WORD_WAVE_PLAYABLE_MAX_WORD_LENGTH &&
  !WORD_WAVE_AWKWARD_WORDS.has(word);

// Word Wave should feel like finding clear human words, not Scrabble leftovers.
// The broader WORD_WAVE_WORDS list remains available as source data, but this
// mode currently generates, displays, and validates only the stricter playable
// set.
const WORD_BANK = toWordBank(WORD_WAVE_COMMON_WORDS).filter(
  isPlayableWordWaveWord,
);
const VALIDATION_WORDS = new Set(WORD_BANK);

const SEED_WORDS = WORD_BANK;
const WORDS_BY_LENGTH = WORD_BANK.reduce((groups, word) => {
  const words = groups.get(word.length) ?? [];

  words.push(word);
  groups.set(word.length, words);

  return groups;
}, new Map<number, string[]>());

const LETTER_BAG = 'EEEEEEEEAAAARRRIIIOOOTTNNSSLLCCDDPPMMGGUUBBFFHHWWYYVK';
const MAX_WORD_LENGTH = Math.max(...WORD_BANK.map(word => word.length));
const WORDS = new Set(WORD_BANK);
const PREFIXES = new Set<string>();

WORD_BANK.forEach(word => {
  for (let i = 1; i <= word.length; i += 1) {
    PREFIXES.add(word.slice(0, i));
  }
});

let nextTileId = 1;

const createTile = (letter: string): WordWaveTile => ({
  id: `wave-${nextTileId++}`,
  letter,
});

const randomLetter = () =>
  LETTER_BAG[Math.floor(Math.random() * LETTER_BAG.length)];

const shuffle = <T>(items: T[]) => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const positionsEqual = (a: WordWavePosition, b: WordWavePosition) =>
  a.row === b.row && a.col === b.col;

const positionKey = ({row, col}: WordWavePosition) => `${row}:${col}`;
const directionKey = ({dx, dy}: WordWaveDirection) => `${dx}:${dy}`;
const isDiagonalDirection = ({dx, dy}: WordWaveDirection) => dx !== 0 && dy !== 0;
const isHorizontalDirection = ({dx, dy}: WordWaveDirection) =>
  dy === 0 && dx !== 0;
const isVerticalDirection = ({dx, dy}: WordWaveDirection) =>
  dx === 0 && dy !== 0;

const calculateDirection = (
  start: WordWavePosition,
  end: WordWavePosition,
): WordWaveDirection => {
  const dx = end.col - start.col;
  const dy = start.row - end.row;
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

  if (angle >= 337.5 || angle < 22.5) {
    return {dx: 1, dy: 0};
  }
  if (angle >= 22.5 && angle < 67.5) {
    return {dx: 1, dy: -1};
  }
  if (angle >= 67.5 && angle < 112.5) {
    return {dx: 0, dy: -1};
  }
  if (angle >= 112.5 && angle < 157.5) {
    return {dx: -1, dy: -1};
  }
  if (angle >= 157.5 && angle < 202.5) {
    return {dx: -1, dy: 0};
  }
  if (angle >= 202.5 && angle < 247.5) {
    return {dx: -1, dy: 1};
  }
  if (angle >= 247.5 && angle < 292.5) {
    return {dx: 0, dy: 1};
  }

  return {dx: 1, dy: 1};
};

const isInsideBoard = ({row, col}: WordWavePosition) =>
  row >= 0 && row < WORD_WAVE_SIZE && col >= 0 && col < WORD_WAVE_SIZE;

const maxStepsForDirection = (
  start: WordWavePosition,
  direction: WordWaveDirection,
) => {
  const maxStepsX =
    direction.dx > 0
      ? WORD_WAVE_SIZE - 1 - start.col
      : direction.dx < 0
        ? start.col
        : Number.POSITIVE_INFINITY;

  const maxStepsY =
    direction.dy > 0
      ? WORD_WAVE_SIZE - 1 - start.row
      : direction.dy < 0
        ? start.row
        : Number.POSITIVE_INFINITY;

  return Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));
};

export const getWordWaveSelectionPath = (
  start: WordWavePosition,
  end: WordWavePosition,
) => {
  if (!isInsideBoard(start) || !isInsideBoard(end)) {
    return [];
  }

  if (positionsEqual(start, end)) {
    return [start];
  }

  const direction = calculateDirection(start, end);
  const requestedSteps = Math.max(
    Math.abs(end.col - start.col),
    Math.abs(end.row - start.row),
  );
  const steps = Math.min(requestedSteps, maxStepsForDirection(start, direction));
  const path: WordWavePosition[] = [];

  for (let step = 0; step <= steps; step += 1) {
    path.push({
      row: start.row + direction.dy * step,
      col: start.col + direction.dx * step,
    });
  }

  return path;
};

const isStraightWordWavePath = (path: WordWavePosition[]) => {
  if (path.length <= 1) {
    return true;
  }

  const dx = path[1].col - path[0].col;
  const dy = path[1].row - path[0].row;

  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) {
    return false;
  }

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

export const getWordWaveDictionary = () => WORD_BANK;

const getPathForWordPlacement = (
  row: number,
  col: number,
  direction: WordWaveDirection,
  word: string,
) => {
  const path: WordWavePosition[] = [];

  for (let index = 0; index < word.length; index += 1) {
    const position = {
      row: row + direction.dy * index,
      col: col + direction.dx * index,
    };

    if (!isInsideBoard(position)) {
      return null;
    }

    path.push(position);
  }

  return path;
};

const canPlaceWord = (
  slots: BoardSlots,
  word: string,
  path: WordWavePosition[],
) =>
  path.every((position, index) => {
    const slot = slots[position.row][position.col];
    return !slot || slot.letter === word[index];
  });

const placeWord = (
  slots: BoardSlots,
  word: string,
  path: WordWavePosition[],
) => {
  path.forEach((position, index) => {
    if (!slots[position.row][position.col]) {
      slots[position.row][position.col] = createTile(word[index]);
    }
  });
};

const tryPlaceWordAnywhere = (slots: BoardSlots, word: string) => {
  const placements = shuffle(
    Array.from({length: WORD_WAVE_SIZE}, (_, row) =>
      Array.from({length: WORD_WAVE_SIZE}, (__, col) =>
        WORD_WAVE_DIRECTIONS.map(direction => ({row, col, direction})),
      ).flat(),
    ).flat(),
  );

  for (const placement of placements) {
    const path = getPathForWordPlacement(
      placement.row,
      placement.col,
      placement.direction,
      word,
    );

    if (path && canPlaceWord(slots, word, path)) {
      placeWord(slots, word, path);
      return true;
    }
  }

  return false;
};

const createSeededBoard = () => {
  const slots: BoardSlots = Array.from({length: WORD_WAVE_SIZE}, () =>
    Array.from({length: WORD_WAVE_SIZE}, () => null),
  );
  let placed = 0;
  let attempts = 0;

  // SEED_WORDS can hold tens of thousands of entries, so iterate a shuffled
  // stream and stop as soon as the board is seeded (or we've tried enough
  // candidates). Without the caps, a full board turns every remaining word into
  // a failing full-board placement search and board creation grinds to a halt.
  for (const word of shuffle(SEED_WORDS)) {
    if (placed >= 14 || attempts >= 300) {
      break;
    }

    attempts += 1;

    if (tryPlaceWordAnywhere(slots, word)) {
      placed += 1;
    }
  }

  return fillRandomSlots(slots);
};

export const createWordWaveBoard = (): WordWaveBoard => {
  let bestBoard = createSeededBoard();
  let bestScore = scoreWordWaveBoard(bestBoard).score;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const board = createSeededBoard();
    const score = scoreWordWaveBoard(board).score;

    if (score > bestScore) {
      bestBoard = board;
      bestScore = score;
    }

    if (isBoardQualityPlayable(scoreWordWaveBoard(board))) {
      return board;
    }
  }

  return bestBoard;
};

export const getWordFromPath = (
  board: WordWaveBoard,
  path: WordWavePosition[],
) => path.map(({row, col}) => board[row]?.[col]?.letter ?? '').join('');

export const areWordWavePositionsAdjacent = (
  a: WordWavePosition,
  b: WordWavePosition,
) => {
  const rowDistance = Math.abs(a.row - b.row);
  const colDistance = Math.abs(a.col - b.col);

  return (
    rowDistance <= 1 &&
    colDistance <= 1 &&
    (rowDistance > 0 || colDistance > 0)
  );
};

export const isValidWordWaveSelection = (
  board: WordWaveBoard,
  path: WordWavePosition[],
) => {
  const seen = new Set<string>();

  if (path.length < WORD_WAVE_MIN_WORD_LENGTH) {
    return false;
  }

  if (!isStraightWordWavePath(path)) {
    return false;
  }

  for (let i = 0; i < path.length; i += 1) {
    const current = path[i];

    if (
      !isInsideBoard(current) ||
      seen.has(positionKey(current))
    ) {
      return false;
    }

    seen.add(positionKey(current));
  }

  // Accept any valid dictionary word, not just the common generation words.
  return VALIDATION_WORDS.has(getWordFromPath(board, path));
};

export const findWordWaveMoves = (
  board: WordWaveBoard,
  limit = Number.POSITIVE_INFINITY,
): WordWaveMove[] => {
  const moves: WordWaveMove[] = [];
  const seenMoves = new Set<string>();

  for (let row = 0; row < WORD_WAVE_SIZE; row += 1) {
    for (let col = 0; col < WORD_WAVE_SIZE; col += 1) {
      for (const direction of WORD_WAVE_DIRECTIONS) {
        let word = '';
        const path: WordWavePosition[] = [];

        for (let step = 0; step < MAX_WORD_LENGTH; step += 1) {
          if (moves.length >= limit) {
            return moves.sort((a, b) => a.word.localeCompare(b.word));
          }

          const position = {
            row: row + direction.dy * step,
            col: col + direction.dx * step,
          };

          if (!isInsideBoard(position)) {
            break;
          }

          word += board[position.row][position.col].letter;
          path.push(position);

          if (!PREFIXES.has(word)) {
            break;
          }

          const pathKey = path.map(positionKey).join('|');

          if (
            word.length >= WORD_WAVE_MIN_WORD_LENGTH &&
            WORDS.has(word) &&
            !seenMoves.has(`${word}:${pathKey}`)
          ) {
            seenMoves.add(`${word}:${pathKey}`);
            moves.push({word, path: [...path], direction});
          }
        }
      }
    }
  }

  return moves.sort((a, b) => a.word.localeCompare(b.word));
};

export const getWordWaveMoveScore = (move: WordWaveMove) => {
  const diagonalBonus = isDiagonalDirection(move.direction) ? 180 : 0;
  const deepBonus = move.path.some(position => position.row >= 3) ? 140 : 0;
  const centerBonus = getMoveCenterScore(move) * 90;
  const areaBonus = getMoveAreaScore(move) * 28;
  const topBandPenalty = isTopBandMove(move) ? 220 : 0;
  const edgePenalty = touchesEdge(move) ? 55 : 0;
  const shortPenalty = move.word.length <= 3 ? 260 : 0;

  return (
    move.word.length * move.word.length * 120 +
    diagonalBonus +
    deepBonus +
    centerBonus +
    areaBonus -
    topBandPenalty -
    edgePenalty -
    shortPenalty
  );
};

const getUniqueMovesByWord = (moves: WordWaveMove[]) => {
  const usedWords = new Set<string>();

  return moves.filter(move => {
    if (usedWords.has(move.word)) {
      return false;
    }

    usedWords.add(move.word);
    return true;
  });
};

const getLocationBucketKey = ({row, col}: WordWavePosition) =>
  `${Math.floor((row * 3) / WORD_WAVE_SIZE)}:${Math.floor(
    (col * 3) / WORD_WAVE_SIZE,
  )}`;

const getEdgeDistance = ({row, col}: WordWavePosition) =>
  Math.min(row, col, WORD_WAVE_SIZE - 1 - row, WORD_WAVE_SIZE - 1 - col);

const getMoveCenterScore = (move: WordWaveMove) => {
  const averageDistance =
    move.path.reduce((sum, position) => sum + getEdgeDistance(position), 0) /
    move.path.length;

  return averageDistance / Math.floor(WORD_WAVE_SIZE / 2);
};

const touchesEdge = (move: WordWaveMove) =>
  move.path.some(position => getEdgeDistance(position) === 0);

const isTopBandMove = (move: WordWaveMove) =>
  move.path.every(position => position.row <= 1);

const isSameClearedLaneMove = (
  move: WordWaveMove,
  context?: WordWaveScoreContext,
) => {
  if (!context) {
    return false;
  }

  if (
    isHorizontalDirection(move.direction) &&
    move.path.some(position => context.removedRows?.has(position.row))
  ) {
    return true;
  }

  return (
    isVerticalDirection(move.direction) &&
    move.path.some(position => context.removedCols?.has(position.col))
  );
};

const getFreshCellOverlap = (
  move: WordWaveMove,
  context?: WordWaveScoreContext,
) =>
  move.path.filter(position => context?.freshPositions?.has(positionKey(position)))
    .length;

const getMoveAreaScore = (move: WordWaveMove) => {
  const rows = move.path.map(position => position.row);
  const cols = move.path.map(position => position.col);
  const rowSpan = Math.max(...rows) - Math.min(...rows) + 1;
  const colSpan = Math.max(...cols) - Math.min(...cols) + 1;
  const bucketCount = new Set(move.path.map(getLocationBucketKey)).size;

  return rowSpan + colSpan + bucketCount;
};

const getMixedMoveScore = (
  move: WordWaveMove,
  context?: WordWaveScoreContext,
) => {
  const freshOverlap = getFreshCellOverlap(move, context);
  const existingOverlap = move.path.length - freshOverlap;

  if (freshOverlap === 0 || existingOverlap === 0) {
    return 0;
  }

  return (
    move.word.length * 16 +
    Math.min(freshOverlap, existingOverlap) * 24 +
    getMoveAreaScore(move) * 10 +
    (isDiagonalDirection(move.direction) ? 36 : 0) +
    (move.path.some(position => position.row >= 3) ? 30 : 0)
  );
};

const getCellUsagePenalty = (moves: WordWaveMove[]) => {
  const usage = new Map<string, number>();

  moves.forEach(move => {
    move.path.forEach(position => {
      const key = positionKey(position);
      usage.set(key, (usage.get(key) ?? 0) + 1);
    });
  });

  return Array.from(usage.values()).reduce(
    (penalty, count) => penalty + Math.max(0, count - 2) ** 2,
    0,
  );
};

const getMoveCoverage = (moves: WordWaveMove[]) => {
  const coveredCells = new Set<string>();
  const goodCoveredCells = new Set<string>();
  const longCoveredCells = new Set<string>();
  const deepGoodCoveredCells = new Set<string>();

  moves.forEach(move => {
    move.path.forEach(position => {
      const key = positionKey(position);
      coveredCells.add(key);

      if (move.word.length >= 4) {
        goodCoveredCells.add(key);

        if (position.row >= 3) {
          deepGoodCoveredCells.add(key);
        }
      }

      if (move.word.length >= 5) {
        longCoveredCells.add(key);
      }
    });
  });

  const allCells = Array.from({length: WORD_WAVE_SIZE}, (_, row) =>
    Array.from({length: WORD_WAVE_SIZE}, (__, col) => ({row, col})),
  ).flat();
  const unreachableCells = allCells.filter(
    position => !coveredCells.has(positionKey(position)),
  ).length;
  const garbageCells = allCells.filter(
    position => !goodCoveredCells.has(positionKey(position)),
  ).length;
  const deepGarbageCells = allCells.filter(
    position => position.row >= 3 && !goodCoveredCells.has(positionKey(position)),
  ).length;
  const longGarbageCells = allCells.filter(
    position => !longCoveredCells.has(positionKey(position)),
  ).length;

  return {
    coveredCells: coveredCells.size,
    goodCoveredCells: goodCoveredCells.size,
    longCoveredCells: longCoveredCells.size,
    deepGoodCoveredCells: deepGoodCoveredCells.size,
    unreachableCells,
    garbageCells,
    deepGarbageCells,
    longGarbageCells,
  };
};

const scoreWordWaveBoard = (
  board: WordWaveBoard,
  context?: WordWaveScoreContext,
) => {
  const moves = findWordWaveMoves(board);
  const uniqueMoves = getUniqueMovesByWord(moves);
  const uniqueWords = uniqueMoves.length;
  const longWords = uniqueMoves.filter(move => move.word.length >= 5).length;
  const veryLongWords = uniqueMoves.filter(move => move.word.length >= 6).length;
  const diagonalMoves = uniqueMoves.filter(move =>
    isDiagonalDirection(move.direction),
  ).length;
  const axisMoves = uniqueMoves.length - diagonalMoves;
  const innerMoves = uniqueMoves.filter(move =>
    move.path.some(position => position.row >= 2 && position.row <= 5),
  ).length;
  const deepFreshMoves = uniqueMoves.filter(move => {
    const freshOverlap = getFreshCellOverlap(move, context);

    return (
      freshOverlap > 0 &&
      move.path.some(position => position.row >= 3) &&
      !isHorizontalDirection(move.direction)
    );
  }).length;
  const lengthDepthScore = uniqueMoves.reduce(
    (sum, move) => sum + Math.max(0, move.word.length - 3) ** 2,
    0,
  );
  const mixedMoves = uniqueMoves.filter(move => getMixedMoveScore(move, context) > 0)
    .length;
  const mixedMoveScore = uniqueMoves.reduce(
    (sum, move) => sum + getMixedMoveScore(move, context),
    0,
  );
  const areaScore = uniqueMoves.reduce(
    (sum, move) => sum + getMoveAreaScore(move),
    0,
  );
  const topBandMoves = uniqueMoves.filter(isTopBandMove).length;
  const topBandHorizontalMoves = uniqueMoves.filter(
    move => isTopBandMove(move) && isHorizontalDirection(move.direction),
  ).length;
  const freshDominatedMoves = uniqueMoves.filter(move => {
    const freshOverlap = getFreshCellOverlap(move, context);
    return freshOverlap > 0 && freshOverlap / move.path.length >= 0.5;
  }).length;
  const freshAxisMoves = uniqueMoves.filter(move => {
    const freshOverlap = getFreshCellOverlap(move, context);
    return freshOverlap > 0 && !isDiagonalDirection(move.direction);
  }).length;
  const sameClearedLaneMoves = uniqueMoves.filter(move =>
    isSameClearedLaneMove(move, context),
  ).length;
  const locationBucketCount = new Set(
    uniqueMoves.flatMap(move => move.path.map(getLocationBucketKey)),
  ).size;
  const directionCount = new Set(uniqueMoves.map(move => directionKey(move.direction)))
    .size;
  const centralityScore = uniqueMoves.reduce(
    (sum, move) => sum + getMoveCenterScore(move),
    0,
  );
  const averageLength =
    uniqueMoves.reduce((sum, move) => sum + move.word.length, 0) /
    Math.max(1, uniqueMoves.length);
  const shortWords = uniqueMoves.filter(move => move.word.length <= 3).length;
  const edgeWords = uniqueMoves.filter(touchesEdge).length;
  const easyWords = uniqueMoves.filter(
    move =>
      move.word.length <= 4 &&
      !isDiagonalDirection(move.direction) &&
      touchesEdge(move),
  ).length;
  const repeatedCellPenalty = getCellUsagePenalty(uniqueMoves);
  const coverage = getMoveCoverage(uniqueMoves);
  const diagonalBalancePenalty =
    uniqueMoves.length > 0
      ? Math.abs(diagonalMoves / uniqueMoves.length - 0.45) * 120
      : 0;
  const axisOnlyPenalty = axisMoves > 0 && diagonalMoves === 0 ? 220 : 0;
  const score =
    uniqueWords * 10 +
    longWords * 24 +
    veryLongWords * 34 +
    lengthDepthScore * 34 +
    diagonalMoves * 24 +
    innerMoves * 12 +
    deepFreshMoves * 36 +
    mixedMoves * 42 +
    mixedMoveScore * 3 +
    areaScore * 8 +
    coverage.goodCoveredCells * 52 +
    coverage.longCoveredCells * 32 +
    coverage.deepGoodCoveredCells * 68 +
    directionCount * 32 +
    locationBucketCount * 28 +
    centralityScore * 18 +
    averageLength * 18 -
    shortWords * 360 -
    edgeWords * 16 -
    easyWords * 84 -
    topBandMoves * 54 -
    topBandHorizontalMoves * 170 -
    freshDominatedMoves * 44 -
    freshAxisMoves * 28 -
    sameClearedLaneMoves * 260 -
    coverage.unreachableCells * 90 -
    coverage.garbageCells * 260 -
    coverage.deepGarbageCells * 420 -
    coverage.longGarbageCells * 34 -
    repeatedCellPenalty * 16 -
    diagonalBalancePenalty -
    axisOnlyPenalty;

  return {
    moves,
    usesRefillContext: Boolean(context?.freshPositions?.size),
    uniqueWords,
    longWords,
    veryLongWords,
    diagonalMoves,
    innerMoves,
    deepFreshMoves,
    mixedMoves,
    mixedMoveScore,
    areaScore,
    directionCount,
    locationBucketCount,
    shortWords,
    edgeWords,
    easyWords,
    topBandMoves,
    topBandHorizontalMoves,
    freshDominatedMoves,
    freshAxisMoves,
    sameClearedLaneMoves,
    ...coverage,
    repeatedCellPenalty,
    score,
  };
};

const summarizeBoard = (board: WordWaveBoard) => {
  const moves = findWordWaveMoves(board);
  const uniqueWords = new Set(moves.map(move => move.word)).size;
  const longestWord = moves.reduce(
    (longest, move) => Math.max(longest, move.word.length),
    0,
  );
  const directionCount = new Set(
    moves.map(move => directionKey(move.direction)),
  ).size;

  return {
    moves,
    moveCount: moves.length,
    uniqueWords,
    longestWord,
    directionCount,
  };
};

const summarizeOpportunities = (board: WordWaveBoard) => {
  const boardQuality = scoreWordWaveBoard(board);
  const moves = getUniqueMovesByWord(findWordWaveMoves(board));
  const goodMoves = moves.filter(move => move.word.length >= 4);
  const qualityMoves = moves.filter(
    move =>
      move.word.length >= 5 &&
      move.path.some(position => position.row >= 3),
  );
  const coverage = getMoveCoverage(moves);
  const directionCount = new Set(
    moves.map(move => directionKey(move.direction)),
  ).size;

  return {
    moves,
    score: boardQuality.score,
    healthScore: getStaticRefillForecastScore({board, quality: boardQuality}),
    opportunities: moves.length,
    goodOpportunities: goodMoves.length,
    qualityOpportunities: qualityMoves.length,
    goodCoverage: coverage.goodCoveredCells,
    deepGarbage: coverage.deepGarbageCells,
    directionCount,
  };
};

const isBoardQualityPlayable = (quality: ReturnType<typeof scoreWordWaveBoard>) =>
  quality.uniqueWords >= 10 &&
  quality.longWords >= 3 &&
  quality.veryLongWords >= 1 &&
  quality.diagonalMoves >= 2 &&
  quality.innerMoves >= 5 &&
  (!quality.usesRefillContext || quality.mixedMoves >= 1) &&
  quality.directionCount >= 4 &&
  quality.locationBucketCount >= 6 &&
  quality.shortWords <= Math.ceil(quality.uniqueWords * 0.3) &&
  quality.easyWords <= Math.ceil(quality.uniqueWords * 0.32) &&
  quality.topBandHorizontalMoves <= Math.max(1, Math.floor(quality.uniqueWords * 0.18)) &&
  quality.freshDominatedMoves <= Math.max(2, Math.floor(quality.uniqueWords * 0.25)) &&
  quality.freshAxisMoves <= Math.max(3, Math.floor(quality.uniqueWords * 0.35)) &&
  quality.sameClearedLaneMoves <= Math.max(2, Math.floor(quality.uniqueWords * 0.25)) &&
  quality.repeatedCellPenalty <= quality.uniqueWords * 2;

const createCollapsedSlots = (
  board: WordWaveBoard,
  removedPath: WordWavePosition[],
): BoardSlots => {
  const removed = new Set(removedPath.map(positionKey));
  const slots: BoardSlots = Array.from({length: WORD_WAVE_SIZE}, () =>
    Array.from({length: WORD_WAVE_SIZE}, () => null),
  );

  for (let col = 0; col < WORD_WAVE_SIZE; col += 1) {
    const survivors: WordWaveTile[] = [];

    for (let row = WORD_WAVE_SIZE - 1; row >= 0; row -= 1) {
      if (!removed.has(`${row}:${col}`)) {
        survivors.push(board[row][col]);
      }
    }

    for (let index = 0; index < survivors.length; index += 1) {
      slots[WORD_WAVE_SIZE - 1 - index][col] = survivors[index];
    }
  }

  return slots;
};

const fillRandomSlots = (slots: BoardSlots): WordWaveBoard =>
  slots.map(row => row.map(tile => tile ?? createTile(randomLetter())));

const cloneSlots = (slots: BoardSlots): BoardSlots =>
  slots.map(row => [...row]);

const cloneBoardWithTile = (
  board: WordWaveBoard,
  position: WordWavePosition,
  letter: string,
) =>
  board.map((row, rowIndex) =>
    row.map((tile, colIndex) =>
      rowIndex === position.row && colIndex === position.col
        ? {...tile, letter}
        : tile,
    ),
  );

const getFreshPositions = (slots: BoardSlots) => {
  const freshPositions = new Set<string>();

  slots.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (!tile) {
        freshPositions.add(positionKey({row: rowIndex, col: colIndex}));
      }
    });
  });

  return freshPositions;
};

const getRefillScoreContext = (
  slots: BoardSlots,
  removedPath: WordWavePosition[],
): WordWaveScoreContext => ({
  freshPositions: getFreshPositions(slots),
  removedRows: new Set(removedPath.map(position => position.row)),
  removedCols: new Set(removedPath.map(position => position.col)),
});

const findInjectionPath = (slots: BoardSlots, word: string) => {
  const placements = shuffle(
    Array.from({length: WORD_WAVE_SIZE}, (_, row) =>
      Array.from({length: WORD_WAVE_SIZE}, (__, col) =>
        WORD_WAVE_DIRECTIONS.map(direction => ({row, col, direction})),
      ).flat(),
    ).flat(),
  );

  for (const placement of placements) {
    const path = getPathForWordPlacement(
      placement.row,
      placement.col,
      placement.direction,
      word,
    );

    if (
      path &&
      canPlaceWord(slots, word, path) &&
      path.some(position => slots[position.row][position.col] === null)
    ) {
      return path;
    }
  }

  return null;
};

const injectWord = (slots: BoardSlots, usedWords = new Set<string>()) => {
  const words = shuffle([...WORD_BANK].sort((a, b) => b.length - a.length));

  for (const word of words) {
    if (usedWords.has(word)) {
      continue;
    }

    const path = findInjectionPath(slots, word);

    if (!path) {
      continue;
    }

    placeWord(slots, word, path);
    return word;
  }

  return undefined;
};

const getInjectionOptionScore = (
  option: Omit<WordWaveInjectionOption, 'score'>,
  slots: BoardSlots,
  context: WordWaveScoreContext,
) => {
  const freshCells = option.path.filter(position => !slots[position.row][position.col])
    .length;
  const existingCells = option.path.length - freshCells;
  const deepCells = option.path.filter(position => position.row >= 3).length;
  const direction = {
    dx: option.path[1]?.col - option.path[0].col || 0,
    dy: option.path[1]?.row - option.path[0].row || 0,
  };
  const move = {word: option.word, path: option.path, direction};
  const diagonalBonus = isDiagonalDirection(direction) ? 170 : 0;
  const verticalBonus = isVerticalDirection(direction) ? 70 : 0;
  const topBandPenalty = isTopBandMove(move) ? 220 : 0;
  const horizontalPenalty = isHorizontalDirection(direction) ? 120 : 0;
  const sameLanePenalty = isSameClearedLaneMove(move, context) ? 700 : 0;
  const shortPenalty = option.word.length <= 3 ? 90 : 0;
  const areaScore = getMoveAreaScore(move);
  // A refilled word that lives almost entirely in the just-emptied cells is a
  // gift: the player watches a whole new word drop straight into the gap. Push
  // fresh-dominated placements down hard so the injector favours words that
  // weave through letters already on the board instead of spelling themselves
  // out in the fresh column(s).
  const freshRatio =
    option.path.length > 0 ? freshCells / option.path.length : 0;
  const freshDominancePenalty = freshRatio > 0.5 ? (freshRatio - 0.5) * 1600 : 0;

  return (
    option.word.length * option.word.length * 16 +
    freshCells * 18 +
    existingCells * 72 +
    deepCells * 45 +
    areaScore * 24 +
    diagonalBonus +
    verticalBonus -
    topBandPenalty -
    horizontalPenalty -
    sameLanePenalty -
    shortPenalty -
    freshDominancePenalty
  );
};

const getSmartInjectionOptions = (
  slots: BoardSlots,
  context: WordWaveScoreContext,
  limit = 96,
) => {
  const options: WordWaveInjectionOption[] = [];
  const getMatchingWordsForPath = (path: WordWavePosition[], length: number) => {
    const matches: string[] = [];

    for (const word of WORDS_BY_LENGTH.get(length) ?? []) {
      if (
        path.every((position, index) => {
          const tile = slots[position.row][position.col];
          return !tile || tile.letter === word[index];
        })
      ) {
        matches.push(word);

        if (matches.length >= 8) {
          break;
        }
      }
    }

    return matches;
  };

  for (let row = 0; row < WORD_WAVE_SIZE; row += 1) {
    for (let col = 0; col < WORD_WAVE_SIZE; col += 1) {
      for (const direction of WORD_WAVE_DIRECTIONS) {
        for (
          let length = WORD_WAVE_SIZE;
          length >= WORD_WAVE_PLANNED_MIN_WORD_LENGTH;
          length -= 1
        ) {
          const path = getPathForWordPlacement(row, col, direction, 'A'.repeat(length));

          if (!path) {
            continue;
          }

          const freshCells = path.filter(position => !slots[position.row][position.col])
            .length;
          const existingCells = length - freshCells;

          if (
            freshCells === 0 ||
            existingCells === 0 ||
            // Reject placements that would drop a near-complete new word into the
            // gap. Requiring the fresh cells to stay close to the existing ones
            // (at most one more) keeps the injected word anchored to the board
            // the player already sees, so refills read as harder puzzles rather
            // than free words appearing in the just-cleared cells.
            freshCells - existingCells >= 2 ||
            !path.some(position => position.row >= 3)
          ) {
            continue;
          }

          const matchingWords = getMatchingWordsForPath(path, length);

          matchingWords.forEach(word => {
            const option = {word, path};
            options.push({
              ...option,
              score: getInjectionOptionScore(option, slots, context),
            });
          });
        }
      }
    }
  }

  return options.sort((a, b) => b.score - a.score).slice(0, limit);
};

const createSmartCandidateSlots = (
  collapsedSlots: BoardSlots,
  options: WordWaveInjectionOption[],
  maxInjectedWords = 5,
) => {
  const slots = cloneSlots(collapsedSlots);
  const usedWords = new Set<string>();
  const headOptions = options.slice(0, Math.min(28, options.length));
  const firstOption = shuffle(headOptions)[0];

  if (firstOption && canPlaceWord(slots, firstOption.word, firstOption.path)) {
    placeWord(slots, firstOption.word, firstOption.path);
    usedWords.add(firstOption.word);
  }

  options.some(option => {
    if (usedWords.size >= maxInjectedWords) {
      return true;
    }

    if (usedWords.has(option.word) || !canPlaceWord(slots, option.word, option.path)) {
      return false;
    }

    placeWord(slots, option.word, option.path);
    usedWords.add(option.word);
    return false;
  });

  return slots;
};

const injectUntilPlayable = (slots: BoardSlots) => {
  const injectedWords: string[] = [];
  const usedWords = new Set<string>();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const injectedWord = injectWord(slots, usedWords);

    if (!injectedWord) {
      break;
    }

    injectedWords.push(injectedWord);
    usedWords.add(injectedWord);

    const board = fillRandomSlots(slots.map(row => [...row]));

    if (findWordWaveMoves(board).length >= 4) {
      return injectedWords;
    }
  }

  return injectedWords;
};

const addRefillCandidate = (
  candidates: ScoredWordWaveCandidate[],
  candidate: ScoredWordWaveCandidate,
  limit = 24,
) => {
  candidates.push(candidate);
  candidates.sort(
    (a, b) => getStaticRefillForecastScore(b) - getStaticRefillForecastScore(a),
  );

  if (candidates.length > limit) {
    candidates.length = limit;
  }
};

const getStaticRefillForecastScore = (candidate: ScoredWordWaveCandidate) => {
  const uniqueMoves = getUniqueMovesByWord(candidate.quality.moves);
  const rowCoverage = new Set(
    uniqueMoves.flatMap(move => move.path.map(position => position.row)),
  ).size;
  const colCoverage = new Set(
    uniqueMoves.flatMap(move => move.path.map(position => position.col)),
  ).size;
  const deepMoves = uniqueMoves.filter(move =>
    move.path.some(position => position.row >= 3),
  ).length;
  const topHeavyMoves = uniqueMoves.filter(
    move =>
      isTopBandMove(move) ||
      (move.path.some(position => position.row <= 1) &&
        !move.path.some(position => position.row >= 3)),
  ).length;
  const longDeepMoves = uniqueMoves.filter(
    move =>
      move.word.length >= 5 &&
      move.path.some(position => position.row >= 3),
  ).length;
  const diagonalRatio =
    candidate.quality.diagonalMoves / Math.max(1, uniqueMoves.length);
  const scarcityPenalty = Math.max(0, 10 - uniqueMoves.length) * 740;
  const directionPenalty = Math.max(0, 5 - candidate.quality.directionCount) * 260;
  const deepPenalty = Math.max(0, 7 - deepMoves) * 280;
  const coveragePenalty = Math.max(0, 5 - rowCoverage) * 190 +
    Math.max(0, 5 - colCoverage) * 190;
  const garbagePenalty =
    candidate.quality.garbageCells * 520 +
    candidate.quality.deepGarbageCells * 820 +
    candidate.quality.unreachableCells * 260;
  const topHeavyPenalty = topHeavyMoves * 120;
  const sameLanePenalty = candidate.quality.sameClearedLaneMoves * 1250;
  const topHorizontalPenalty = candidate.quality.topBandHorizontalMoves * 240;
  const freshDominatedPenalty = candidate.quality.freshDominatedMoves * 150;
  const shortWordPenalty = candidate.quality.shortWords * 520;
  const diagonalPenalty = Math.abs(diagonalRatio - 0.45) * 500;

  return (
    candidate.quality.score +
    uniqueMoves.length * 180 +
    deepMoves * 85 +
    longDeepMoves * 260 +
    candidate.quality.mixedMoves * 160 +
    candidate.quality.mixedMoveScore * 4 +
    candidate.quality.areaScore * 10 +
    candidate.quality.goodCoveredCells * 260 +
    candidate.quality.longCoveredCells * 120 +
    candidate.quality.deepGoodCoveredCells * 280 +
    rowCoverage * 95 +
    colCoverage * 95 -
    scarcityPenalty -
    directionPenalty -
    deepPenalty -
    coveragePenalty -
    garbagePenalty -
    topHeavyPenalty -
    sameLanePenalty -
    topHorizontalPenalty -
    freshDominatedPenalty -
    shortWordPenalty -
    diagonalPenalty
  );
};

const selectBestRefillCandidate = (
  candidates: ScoredWordWaveCandidate[],
) => {
  const spreadCandidates = candidates.filter(candidate => {
    const uniqueWords = Math.max(1, candidate.quality.uniqueWords);

    return (
      candidate.quality.sameClearedLaneMoves <=
        Math.max(3, Math.floor(uniqueWords * 0.24)) &&
      candidate.quality.shortWords <= Math.max(3, Math.floor(uniqueWords * 0.3)) &&
      candidate.quality.topBandHorizontalMoves <=
        Math.max(2, Math.floor(uniqueWords * 0.2)) &&
      candidate.quality.goodCoveredCells >= 34 &&
      candidate.quality.deepGarbageCells <= 9
    );
  });
  const candidatesToScore =
    spreadCandidates.length > 0 ? spreadCandidates : candidates;

  return candidatesToScore.reduce((best, candidate) =>
    getStaticRefillForecastScore(candidate) > getStaticRefillForecastScore(best)
      ? candidate
      : best,
  );
};

const isCoverageRescueNeeded = (candidate: ScoredWordWaveCandidate) =>
  candidate.quality.goodCoveredCells < 30 ||
  candidate.quality.deepGarbageCells > 12 ||
  candidate.quality.sameClearedLaneMoves >
    Math.max(3, Math.floor(Math.max(1, candidate.quality.uniqueWords) * 0.35));

const getRepairPositions = (board: WordWaveBoard) => {
  const moves = getUniqueMovesByWord(findWordWaveMoves(board));
  const goodCoveredCells = new Set<string>();
  const longCoveredCells = new Set<string>();

  moves.forEach(move => {
    move.path.forEach(position => {
      if (move.word.length >= 4) {
        goodCoveredCells.add(positionKey(position));
      }

      if (move.word.length >= 5) {
        longCoveredCells.add(positionKey(position));
      }
    });
  });

  return Array.from({length: WORD_WAVE_SIZE}, (_, row) =>
    Array.from({length: WORD_WAVE_SIZE}, (__, col) => ({row, col})),
  )
    .flat()
    .map(position => {
      const key = positionKey(position);
      const deepWeight = position.row >= 3 ? 4 : position.row >= 2 ? 2 : 0;
      const goodPenalty = goodCoveredCells.has(key) ? 0 : 8;
      const longPenalty = longCoveredCells.has(key) ? 0 : 3;

      return {
        position,
        score: deepWeight + goodPenalty + longPenalty,
      };
    })
    .filter(item => item.score > 0 && item.position.row >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(item => item.position);
};

const REPAIR_LETTERS = Array.from(new Set(LETTER_BAG.split('')));

const getLongWordRepairLetters = (
  board: WordWaveBoard,
  position: WordWavePosition,
) => {
  const letters = new Map<string, number>();

  for (const direction of WORD_WAVE_DIRECTIONS) {
    for (
      let length = WORD_WAVE_SIZE;
      length >= Math.max(5, WORD_WAVE_PLANNED_MIN_WORD_LENGTH);
      length -= 1
    ) {
      for (let index = 0; index < length; index += 1) {
        const startRow = position.row - direction.dy * index;
        const startCol = position.col - direction.dx * index;
        const path = getPathForWordPlacement(
          startRow,
          startCol,
          direction,
          'A'.repeat(length),
        );

        if (!path) {
          continue;
        }

        for (const word of WORDS_BY_LENGTH.get(length) ?? []) {
          if (
            path.every((pathPosition, pathIndex) => {
              const tile = board[pathPosition.row][pathPosition.col];

              return (
                positionsEqual(pathPosition, position) ||
                tile.letter === word[pathIndex]
              );
            })
          ) {
            const letter = word[index];
            const directionBonus = isDiagonalDirection(direction) ? 10 : 6;
            const deepBonus = position.row >= 3 ? 8 : 0;

            letters.set(
              letter,
              (letters.get(letter) ?? 0) +
                length * length +
                directionBonus +
                deepBonus,
            );
          }
        }
      }
    }
  }

  return [...letters.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([letter]) => letter)
    .slice(0, 10);
};

const getNewRepairMoves = (
  previousBoard: WordWaveBoard,
  candidateBoard: WordWaveBoard,
) => {
  const previousWords = new Set(findWordWaveMoves(previousBoard).map(move => move.word));

  return getUniqueMovesByWord(findWordWaveMoves(candidateBoard)).filter(
    move => !previousWords.has(move.word),
  );
};

const getRepairBuiltWordPenalty = (
  previousBoard: WordWaveBoard,
  candidateBoard: WordWaveBoard,
  repairedPositions: Set<string>,
) =>
  getNewRepairMoves(previousBoard, candidateBoard).reduce((penalty, move) => {
    const repairedOverlap = move.path.filter(position =>
      repairedPositions.has(positionKey(position)),
    ).length;

    if (repairedOverlap === 0) {
      return penalty;
    }

    if (move.word.length <= 4 && repairedOverlap >= 2) {
      return penalty + 90000;
    }

    if (repairedOverlap / move.path.length >= 0.45) {
      return penalty + 70000;
    }

    return penalty + repairedOverlap * repairedOverlap * 2200;
  }, 0);

const repairWordWaveBoard = (
  board: WordWaveBoard,
  context: WordWaveScoreContext,
  maxRepairs = 3,
) => {
  let repairedBoard = board;
  let repairedQuality = scoreWordWaveBoard(repairedBoard, context);
  let repairedCount = 0;
  const repairedPositions = new Set<string>();

  for (let repairIndex = 0; repairIndex < maxRepairs; repairIndex += 1) {
    let bestBoard = repairedBoard;
    let bestQuality = repairedQuality;
    let bestScore = getStaticRefillForecastScore({
      board: bestBoard,
      quality: bestQuality,
    });
    let bestPosition: WordWavePosition | undefined;

    for (const position of getRepairPositions(repairedBoard).slice(0, 8)) {
      const currentLetter = repairedBoard[position.row][position.col].letter;
      const candidateRepairPositions = new Set(repairedPositions);

      candidateRepairPositions.add(positionKey(position));
      const candidateLetters = [
        ...getLongWordRepairLetters(repairedBoard, position),
        ...REPAIR_LETTERS,
      ];
      const triedLetters = new Set<string>();

      for (const letter of candidateLetters) {
        if (letter === currentLetter || triedLetters.has(letter)) {
          continue;
        }

        triedLetters.add(letter);
        const candidateBoard = cloneBoardWithTile(repairedBoard, position, letter);
        const candidateQuality = scoreWordWaveBoard(candidateBoard, context);
        const candidateScore =
          getStaticRefillForecastScore({
            board: candidateBoard,
            quality: candidateQuality,
          }) -
          getRepairBuiltWordPenalty(
            board,
            candidateBoard,
            candidateRepairPositions,
          );

        if (candidateScore > bestScore) {
          bestBoard = candidateBoard;
          bestQuality = candidateQuality;
          bestScore = candidateScore;
          bestPosition = position;
        }
      }
    }

    if (bestBoard === repairedBoard) {
      break;
    }

    repairedBoard = bestBoard;
    repairedQuality = bestQuality;
    if (bestPosition) {
      repairedPositions.add(positionKey(bestPosition));
    }
    repairedCount += 1;
  }

  return {
    board: repairedBoard,
    quality: repairedQuality,
    repairedCount,
  };
};

export const refillWordWaveBoard = (
  board: WordWaveBoard,
  removedPath: WordWavePosition[],
  minAcceptedMoves = 8,
  candidateAttempts = 56,
): WordWaveRefillResult => {
  const collapsedSlots = createCollapsedSlots(board, removedPath);
  const scoreContext = getRefillScoreContext(collapsedSlots, removedPath);
  const injectionOptions = getSmartInjectionOptions(collapsedSlots, scoreContext);
  const firstSlots =
    injectionOptions.length > 0
      ? createSmartCandidateSlots(
          collapsedSlots,
          injectionOptions,
          candidateAttempts >= 120 ? 6 : 5,
        )
      : cloneSlots(collapsedSlots);
  let bestBoard = fillRandomSlots(firstSlots);
  let bestQuality = scoreWordWaveBoard(bestBoard, scoreContext);
  const candidates: ScoredWordWaveCandidate[] = [];

  addRefillCandidate(candidates, {board: bestBoard, quality: bestQuality});

  for (let attempts = 1; attempts <= candidateAttempts; attempts += 1) {
    const candidateSlots =
      injectionOptions.length > 0 && attempts % 6 !== 0
        ? createSmartCandidateSlots(
            collapsedSlots,
            injectionOptions,
            candidateAttempts >= 120 ? 6 : 5,
          )
        : cloneSlots(collapsedSlots);
    const candidate = fillRandomSlots(candidateSlots);
    const quality = scoreWordWaveBoard(candidate, scoreContext);

    addRefillCandidate(candidates, {board: candidate, quality});

    if (quality.score > bestQuality.score) {
      bestBoard = candidate;
      bestQuality = quality;
    }

    if (
      quality.moves.length >= minAcceptedMoves &&
      isBoardQualityPlayable(quality) &&
      quality.score > bestQuality.score
    ) {
      bestBoard = candidate;
      bestQuality = quality;
    }
  }

  const injectedSlots = collapsedSlots.map(row => [...row]);
  const injectedWords = injectUntilPlayable(injectedSlots);
  const injectedBoard = fillRandomSlots(injectedSlots);
  const injectedQuality = scoreWordWaveBoard(injectedBoard, scoreContext);
  addRefillCandidate(candidates, {board: injectedBoard, quality: injectedQuality});
  const forecastBest = selectBestRefillCandidate(candidates);

  bestBoard = forecastBest.board;
  bestQuality = forecastBest.quality;

  if (isCoverageRescueNeeded(forecastBest) && candidateAttempts < 160) {
    return refillWordWaveBoard(board, removedPath, minAcceptedMoves, 160);
  }

  const shouldRepair =
    bestQuality.goodCoveredCells < 34 ||
    bestQuality.deepGarbageCells > 9 ||
    bestQuality.directionCount < 5 ||
    bestQuality.longWords < 5;
  const repairResult = shouldRepair
    ? repairWordWaveBoard(bestBoard, scoreContext)
    : {board: bestBoard, quality: bestQuality, repairedCount: 0};
  bestBoard = repairResult.board;
  bestQuality = repairResult.quality;

  if (
    injectedWords.length > 0 &&
    forecastBest.board === injectedBoard &&
    (isBoardQualityPlayable(bestQuality) || !isBoardQualityPlayable(injectedQuality))
  ) {
    return {
      board: bestBoard,
      moves: bestQuality.moves,
      attempts: candidateAttempts + 1,
      injectedWord: injectedWords.join(', ') || undefined,
      repairedCount: repairResult.repairedCount,
    };
  }

  return {
    board: bestBoard,
    moves: bestQuality.moves,
    attempts: candidateAttempts + 2,
    repairedCount: repairResult.repairedCount,
  };
};

const refillWordWaveBoardFast = (
  board: WordWaveBoard,
  removedPath: WordWavePosition[],
): WordWaveRefillResult => {
  const collapsedSlots = createCollapsedSlots(board, removedPath);
  const scoreContext = getRefillScoreContext(collapsedSlots, removedPath);
  const injectionOptions = getSmartInjectionOptions(
    collapsedSlots,
    scoreContext,
    18,
  );
  const slots =
    injectionOptions.length > 0
      ? createSmartCandidateSlots(collapsedSlots, injectionOptions, 3)
      : cloneSlots(collapsedSlots);
  const nextBoard = fillRandomSlots(slots);

  return {
    board: nextBoard,
    moves: findWordWaveMoves(nextBoard),
    attempts: 1,
    repairedCount: 0,
  };
};

export const simulateWordWaveSurvival = (
  board: WordWaveBoard,
  stars = 100,
  maxMovesPerNode = 14,
  branchBudget = 500,
  refillAttempts = 24,
): WordWaveSurvivalReport => {
  const report: WordWaveSurvivalReport = {
    survives: true,
    branchesChecked: 0,
    branchBudgetHit: false,
    deadBranches: 0,
    minMoves: Number.POSITIVE_INFINITY,
    minUniqueWords: Number.POSITIVE_INFINITY,
    minLongestWord: Number.POSITIVE_INFINITY,
    minDirectionCount: Number.POSITIVE_INFINITY,
    worstPath: [],
  };

  const visit = (
    currentBoard: WordWaveBoard,
    remainingStars: number,
    pathWords: string[],
  ) => {
    if (report.branchesChecked >= branchBudget) {
      report.branchBudgetHit = true;
      return;
    }

    const summary = summarizeBoard(currentBoard);
    report.branchesChecked += 1;
    report.minMoves = Math.min(report.minMoves, summary.moveCount);
    report.minUniqueWords = Math.min(report.minUniqueWords, summary.uniqueWords);
    report.minLongestWord = Math.min(report.minLongestWord, summary.longestWord);
    report.minDirectionCount = Math.min(
      report.minDirectionCount,
      summary.directionCount,
    );

    if (summary.moveCount === 0) {
      report.survives = false;
      report.deadBranches += 1;

      if (report.worstPath.length === 0) {
        report.worstPath = pathWords;
      }

      return;
    }

    if (remainingStars <= 0) {
      return;
    }

    const movesToCheck = [...summary.moves]
      .sort((a, b) => b.word.length - a.word.length)
      .slice(0, maxMovesPerNode);

    for (const move of movesToCheck) {
      const result = refillWordWaveBoard(
        currentBoard,
        move.path,
        1,
        refillAttempts,
      );
      visit(result.board, remainingStars - move.path.length, [
        ...pathWords,
        move.word,
      ]);
    }
  };

  visit(board, stars, []);

  if (!Number.isFinite(report.minMoves)) {
    report.minMoves = 0;
  }
  if (!Number.isFinite(report.minUniqueWords)) {
    report.minUniqueWords = 0;
  }
  if (!Number.isFinite(report.minLongestWord)) {
    report.minLongestWord = 0;
  }
  if (!Number.isFinite(report.minDirectionCount)) {
    report.minDirectionCount = 0;
  }

  return report;
};

const getSurvivalScore = (report: WordWaveSurvivalReport) =>
  (report.survives ? 10000 : 0) +
  report.minMoves * 120 +
  report.minUniqueWords * 80 +
  report.minLongestWord * 55 +
  report.minDirectionCount * 90 -
  report.deadBranches * 500;

export const searchWordWaveSurvivalCandidate = (
  boardsToTry = 12,
  stars = 100,
  maxMovesPerNode = 3,
  branchBudget = 24,
  refillAttempts = 0,
): WordWaveCandidateSearchReport => {
  let bestReport = simulateWordWaveSurvival(
    createWordWaveBoard(),
    stars,
    maxMovesPerNode,
    branchBudget,
    refillAttempts,
  );
  let survivedBoards = bestReport.survives ? 1 : 0;

  for (let boardIndex = 1; boardIndex < boardsToTry; boardIndex += 1) {
    const report = simulateWordWaveSurvival(
      createWordWaveBoard(),
      stars,
      maxMovesPerNode,
      branchBudget,
      refillAttempts,
    );

    if (report.survives) {
      survivedBoards += 1;
    }

    if (getSurvivalScore(report) > getSurvivalScore(bestReport)) {
      bestReport = report;
    }
  }

  return {
    boardsChecked: boardsToTry,
    survivedBoards,
    bestReport,
  };
};

const pickSimulationMove = (moves: WordWaveMove[]) => {
  const rankedMoves = getUniqueMovesByWord(moves)
    .filter(move => move.word.length >= 4)
    .sort(
      (a, b) =>
        getWordWaveMoveScore(b) - getWordWaveMoveScore(a) ||
        b.word.length - a.word.length ||
        a.word.localeCompare(b.word),
    );

  if (rankedMoves.length === 0) {
    return getUniqueMovesByWord(moves)[0];
  }

  const pickLimit = Math.min(8, rankedMoves.length);
  return rankedMoves[Math.floor(Math.random() * pickLimit)];
};

export const simulateWordWaveOpportunityHealth = (
  grids = 6,
  runsPerGrid = 5,
  stepsPerRun = 100,
): WordWaveOpportunityReport => {
  const failures: WordWaveOpportunityReport['failures'] = [];
  let successCount = 0;
  let failureCount = 0;
  let totalInitialScore = 0;
  let totalFinalScore = 0;
  let totalMinScore = 0;
  let totalScoreRetention = 0;
  let totalInitialOpportunities = 0;
  let totalFinalOpportunities = 0;
  let totalMinOpportunities = 0;
  let totalFinalGoodCoverage = 0;
  let totalMinGoodCoverage = 0;
  let totalRepairs = 0;
  const totalRuns = grids * runsPerGrid;

  for (let gridIndex = 0; gridIndex < grids; gridIndex += 1) {
    const initialBoard = createWordWaveBoard();

    for (let runIndex = 0; runIndex < runsPerGrid; runIndex += 1) {
      let board = initialBoard;
      const firstSummary = summarizeOpportunities(board);
      let minScore = firstSummary.healthScore;
      let minOpportunities = firstSummary.opportunities;
      let minGoodCoverage = firstSummary.goodCoverage;
      let finalSummary = firstSummary;
      let failedAtStep = -1;

      totalInitialScore += firstSummary.healthScore;
      totalInitialOpportunities += firstSummary.opportunities;

      for (let step = 0; step < stepsPerRun; step += 1) {
        const move = pickSimulationMove(finalSummary.moves);

        if (!move) {
          failedAtStep = step;
          break;
        }

        const refill = refillWordWaveBoard(board, move.path);
        board = refill.board;
        totalRepairs += refill.repairedCount ?? 0;
        finalSummary = summarizeOpportunities(board);
        minScore = Math.min(minScore, finalSummary.healthScore);
        minOpportunities = Math.min(
          minOpportunities,
          finalSummary.opportunities,
        );
        minGoodCoverage = Math.min(minGoodCoverage, finalSummary.goodCoverage);

        if (
          finalSummary.healthScore <
            firstSummary.healthScore -
              Math.max(1800, Math.abs(firstSummary.healthScore) * 0.45) ||
          finalSummary.goodCoverage < 16
        ) {
          failedAtStep = step + 1;
          break;
        }
      }

      const scoreRetention =
        finalSummary.healthScore / Math.max(1, firstSummary.healthScore);
      totalFinalScore += finalSummary.healthScore;
      totalMinScore += minScore;
      totalScoreRetention += scoreRetention;
      totalFinalOpportunities += finalSummary.opportunities;
      totalMinOpportunities += minOpportunities;
      totalFinalGoodCoverage += finalSummary.goodCoverage;
      totalMinGoodCoverage += minGoodCoverage;

      if (failedAtStep >= 0) {
        failureCount += 1;
        failures.push({
          run: gridIndex * runsPerGrid + runIndex,
          step: failedAtStep,
          initialScore: firstSummary.healthScore,
          score: finalSummary.healthScore,
          minScore,
          scoreRetention,
          opportunities: finalSummary.opportunities,
          goodCoverage: finalSummary.goodCoverage,
          deepGarbage: finalSummary.deepGarbage,
        });
      } else {
        successCount += 1;
      }
    }
  }

  return {
    runs: totalRuns,
    stepsPerRun,
    successCount,
    failureCount,
    averageInitialScore: totalInitialScore / totalRuns,
    averageFinalScore: totalFinalScore / totalRuns,
    averageMinScore: totalMinScore / totalRuns,
    averageScoreRetention: totalScoreRetention / totalRuns,
    averageInitialOpportunities: totalInitialOpportunities / totalRuns,
    averageFinalOpportunities: totalFinalOpportunities / totalRuns,
    averageMinOpportunities: totalMinOpportunities / totalRuns,
    averageFinalGoodCoverage: totalFinalGoodCoverage / totalRuns,
    averageMinGoodCoverage: totalMinGoodCoverage / totalRuns,
    averageRepairs: totalRepairs / totalRuns,
    failures,
  };
};

type TimedPlayerConfig = {
  level: WordWaveTimedPlayerLevel;
  minThinkSeconds: number;
  maxThinkSeconds: number;
};

const TIMED_PLAYER_CONFIGS: TimedPlayerConfig[] = [
  {level: 'bad', minThinkSeconds: 8, maxThinkSeconds: 12},
  {level: 'medium', minThinkSeconds: 5, maxThinkSeconds: 8},
  {level: 'good', minThinkSeconds: 3, maxThinkSeconds: 5},
];

const getWordWaveRepairBudget = (wordLength: number) => {
  if (wordLength >= 7) {
    return 4;
  }

  if (wordLength >= 6) {
    return 3;
  }

  if (wordLength >= 5) {
    return 2;
  }

  return 1;
};

export const getWordWaveArcadeScore = (wordLength: number) =>
  wordLength * 10 + Math.max(0, wordLength - 4) * 18;

export const getWordWavePressureValue = (wordLength: number) =>
  wordLength + Math.max(0, wordLength - 4);

const getRandomThinkSeconds = (config: TimedPlayerConfig) =>
  config.minThinkSeconds +
  Math.random() * (config.maxThinkSeconds - config.minThinkSeconds);

const createBoardWithTopRow = (
  board: WordWaveBoard,
  letters: string[],
): WordWaveBoard => [
  letters.map(createTile),
  ...board.slice(0, WORD_WAVE_SIZE - 1),
];

const getTimedTopRowHints = (board: WordWaveBoard) => {
  const shiftedSlots: BoardSlots = [
    Array.from({length: WORD_WAVE_SIZE}, () => null),
    ...board.slice(0, WORD_WAVE_SIZE - 1),
  ];
  const hints: Array<{col: number; letter: string; score: number}> = [];

  for (let col = 0; col < WORD_WAVE_SIZE; col += 1) {
    for (const direction of [
      {dx: -1, dy: 1},
      {dx: 0, dy: 1},
      {dx: 1, dy: 1},
    ]) {
      for (
        let length = WORD_WAVE_SIZE;
        length >= WORD_WAVE_PLANNED_MIN_WORD_LENGTH;
        length -= 1
      ) {
        const path = getPathForWordPlacement(0, col, direction, 'A'.repeat(length));

        if (!path) {
          continue;
        }

        for (const word of WORDS_BY_LENGTH.get(length) ?? []) {
          if (
            path.every((position, index) => {
              const tile = shiftedSlots[position.row][position.col];
              return !tile || tile.letter === word[index];
            })
          ) {
            hints.push({
              col,
              letter: word[0],
              score:
                word.length * word.length +
                (isDiagonalDirection(direction) ? 8 : 4),
            });
            break;
          }
        }
      }
    }
  }

  return hints.sort((a, b) => b.score - a.score).slice(0, 24);
};

const createSmartTimedTopRow = (board: WordWaveBoard) => {
  const hints = getTimedTopRowHints(board);
  let bestBoard = createBoardWithTopRow(
    board,
    Array.from({length: WORD_WAVE_SIZE}, randomLetter),
  );
  let bestScore = getStaticRefillForecastScore({
    board: bestBoard,
    quality: scoreWordWaveBoard(bestBoard),
  });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const letters = Array.from({length: WORD_WAVE_SIZE}, randomLetter);

    shuffle(hints)
      .slice(0, 4)
      .forEach(hint => {
        letters[hint.col] = hint.letter;
      });

    const candidateBoard = createBoardWithTopRow(
      board,
      letters,
    );
    const candidateScore = getStaticRefillForecastScore({
      board: candidateBoard,
      quality: scoreWordWaveBoard(candidateBoard),
    });

    if (candidateScore > bestScore) {
      bestBoard = candidateBoard;
      bestScore = candidateScore;
    }
  }

  return bestBoard;
};

export const applyWordWaveTimedRowDrop = (board: WordWaveBoard) =>
  createSmartTimedTopRow(board);

export const applyWordWaveTimedWordFound = (
  board: WordWaveBoard,
  wordLength: number,
): WordWaveTimedWordResult => {
  const repairResult = repairWordWaveBoard(
    board,
    {},
    getWordWaveRepairBudget(wordLength),
  );

  return {
    board: repairResult.board,
    repairedCount: repairResult.repairedCount,
    pressureScore: getWordWavePressureValue(wordLength),
    arcadeScore: getWordWaveArcadeScore(wordLength),
  };
};

export const applyWordWaveTimedSelectionFast = (
  board: WordWaveBoard,
  path: WordWavePosition[],
  wordLength: number,
): WordWaveTimedSelectionResult => {
  const refillResult = refillWordWaveBoardFast(board, path);

  return {
    board: refillResult.board,
    repairedCount: 0,
    pressureScore: getWordWavePressureValue(wordLength),
    arcadeScore: getWordWaveArcadeScore(wordLength),
    refillAttempts: refillResult.attempts,
  };
};

const pickTimedPlayerMove = (
  moves: WordWaveMove[],
  level: WordWaveTimedPlayerLevel,
) => {
  const uniqueMoves = getUniqueMovesByWord(moves);

  if (uniqueMoves.length === 0) {
    return undefined;
  }

  if (level === 'bad') {
    const easyMoves = uniqueMoves
      .filter(move => move.word.length <= 4)
      .sort(
        (a, b) =>
          a.word.length - b.word.length ||
          getWordWaveMoveScore(b) - getWordWaveMoveScore(a),
      );
    const pickPool = easyMoves.length > 0 ? easyMoves : uniqueMoves;

    return pickPool[Math.floor(Math.random() * Math.min(8, pickPool.length))];
  }

  if (level === 'medium') {
    const mediumMoves = uniqueMoves
      .filter(move => move.word.length >= 4)
      .sort(
        (a, b) =>
          getWordWaveMoveScore(b) - getWordWaveMoveScore(a) ||
          b.word.length - a.word.length,
      );
    const pickPool = mediumMoves.length > 0 ? mediumMoves : uniqueMoves;

    return pickPool[Math.floor(Math.random() * Math.min(8, pickPool.length))];
  }

  const goodMoves = uniqueMoves
    .filter(move => move.word.length >= 5)
    .sort(
      (a, b) =>
        b.word.length - a.word.length ||
        getWordWaveMoveScore(b) - getWordWaveMoveScore(a),
    );
  const pickPool = goodMoves.length > 0 ? goodMoves : uniqueMoves;

  return pickPool[Math.floor(Math.random() * Math.min(5, pickPool.length))];
};

export const simulateWordWaveTimedGameplay = (
  seconds = 120,
  runsPerPlayer = 30,
  rowDropSeconds = 10,
): WordWaveTimedSimulationReport => {
  const profiles = TIMED_PLAYER_CONFIGS.map(config => {
    let successCount = 0;
    let failureCount = 0;
    let totalInitialScore = 0;
    let totalFinalScore = 0;
    let totalMinScore = 0;
    let totalScoreRetention = 0;
    let totalWordsFound = 0;
    let totalLettersFound = 0;
    let totalLongWordsFound = 0;
    let totalRowDrops = 0;
    let totalRepairSwitches = 0;
    let totalLetterPressureScore = 0;
    let totalArcadeScore = 0;

    for (let run = 0; run < runsPerPlayer; run += 1) {
      let board = createWordWaveBoard();
      let elapsedSeconds = 0;
      let nextFindSeconds = getRandomThinkSeconds(config);
      let nextRowDropSeconds = rowDropSeconds;
      let wordsFound = 0;
      let lettersFound = 0;
      let longWordsFound = 0;
      let rowDrops = 0;
      let repairSwitches = 0;
      let letterPressureScore = 0;
      let arcadeScore = 0;
      let failed = false;
      const firstSummary = summarizeOpportunities(board);
      let minScore = firstSummary.healthScore;
      let finalSummary = firstSummary;

      totalInitialScore += firstSummary.healthScore;

      while (elapsedSeconds < seconds) {
        if (nextRowDropSeconds <= nextFindSeconds) {
          elapsedSeconds = nextRowDropSeconds;
          board = createSmartTimedTopRow(board);
          rowDrops += 1;
          letterPressureScore -= WORD_WAVE_SIZE;
          nextRowDropSeconds += rowDropSeconds;
        } else {
          elapsedSeconds = nextFindSeconds;
          const move = pickTimedPlayerMove(findWordWaveMoves(board), config.level);

          if (!move) {
            failed = true;
            break;
          }

          const wordResult = applyWordWaveTimedWordFound(board, move.word.length);

          board = wordResult.board;
          wordsFound += 1;
          lettersFound += move.word.length;
          longWordsFound += move.word.length >= 5 ? 1 : 0;
          repairSwitches += wordResult.repairedCount;
          letterPressureScore += wordResult.pressureScore;
          arcadeScore += wordResult.arcadeScore;
          nextFindSeconds += getRandomThinkSeconds(config);
        }

        finalSummary = summarizeOpportunities(board);
        minScore = Math.min(minScore, finalSummary.healthScore);

        if (finalSummary.opportunities === 0) {
          failed = true;
          break;
        }
      }

      const scoreRetention =
        finalSummary.healthScore / Math.max(1, firstSummary.healthScore);

      if (!failed && letterPressureScore >= 0) {
        successCount += 1;
      } else {
        failureCount += 1;
      }

      totalFinalScore += finalSummary.healthScore;
      totalMinScore += minScore;
      totalScoreRetention += scoreRetention;
      totalWordsFound += wordsFound;
      totalLettersFound += lettersFound;
      totalLongWordsFound += longWordsFound;
      totalRowDrops += rowDrops;
      totalRepairSwitches += repairSwitches;
      totalLetterPressureScore += letterPressureScore;
      totalArcadeScore += arcadeScore;
    }

    return {
      level: config.level,
      successCount,
      failureCount,
      averageInitialScore: totalInitialScore / runsPerPlayer,
      averageFinalScore: totalFinalScore / runsPerPlayer,
      averageMinScore: totalMinScore / runsPerPlayer,
      averageScoreRetention: totalScoreRetention / runsPerPlayer,
      averageWordsFound: totalWordsFound / runsPerPlayer,
      averageWordLength: totalLettersFound / Math.max(1, totalWordsFound),
      averageLongWordsFound: totalLongWordsFound / runsPerPlayer,
      averageRowDrops: totalRowDrops / runsPerPlayer,
      averageRepairSwitches: totalRepairSwitches / runsPerPlayer,
      averageLetterPressureScore: totalLetterPressureScore / runsPerPlayer,
      averageArcadeScore: totalArcadeScore / runsPerPlayer,
    };
  });

  return {
    seconds,
    runsPerPlayer,
    rowDropSeconds,
    profiles,
  };
};

export const getMoveForPath = (
  board: WordWaveBoard,
  path: WordWavePosition[],
) =>
  isValidWordWaveSelection(board, path)
    ? {word: getWordFromPath(board, path), path}
    : null;

export const pathContainsPosition = (
  path: WordWavePosition[],
  position: WordWavePosition,
) => path.some(item => positionsEqual(item, position));
