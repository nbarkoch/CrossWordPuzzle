import {wordsDictionary} from '~/data/english';

export const WORD_WAVE_SIZE = 7;
export const WORD_WAVE_MIN_WORD_LENGTH = 3;
const WORD_WAVE_PLANNED_MIN_WORD_LENGTH = 4;

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

const WORD_BANK = Array.from(
  new Set(
    Object.values(wordsDictionary)
      .flat()
      .map(normalizeWord)
      .filter(
        word =>
          word.length >= WORD_WAVE_MIN_WORD_LENGTH &&
          word.length <= WORD_WAVE_SIZE,
      ),
  ),
);

const SEED_WORDS = WORD_BANK.filter(word => word.length >= 5);
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

  shuffle([...SEED_WORDS].sort((a, b) => b.length - a.length)).forEach(word => {
    if (placed >= 14) {
      return;
    }

    if (tryPlaceWordAnywhere(slots, word)) {
      placed += 1;
    }
  });

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

  return WORDS.has(getWordFromPath(board, path));
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
    directionCount * 32 +
    locationBucketCount * 28 +
    centralityScore * 18 +
    averageLength * 18 -
    shortWords * 220 -
    edgeWords * 16 -
    easyWords * 84 -
    topBandMoves * 54 -
    topBandHorizontalMoves * 170 -
    freshDominatedMoves * 44 -
    freshAxisMoves * 28 -
    sameClearedLaneMoves * 260 -
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

const isBoardQualityPlayable = (quality: ReturnType<typeof scoreWordWaveBoard>) =>
  quality.uniqueWords >= 10 &&
  quality.longWords >= 3 &&
  quality.veryLongWords >= 1 &&
  quality.diagonalMoves >= 2 &&
  quality.innerMoves >= 5 &&
  (!quality.usesRefillContext || quality.mixedMoves >= 1) &&
  quality.directionCount >= 4 &&
  quality.locationBucketCount >= 6 &&
  quality.shortWords <= Math.ceil(quality.uniqueWords * 0.38) &&
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
    shortPenalty
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
    if (usedWords.size >= 3) {
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
  const topHeavyPenalty = topHeavyMoves * 120;
  const sameLanePenalty = candidate.quality.sameClearedLaneMoves * 1250;
  const topHorizontalPenalty = candidate.quality.topBandHorizontalMoves * 240;
  const freshDominatedPenalty = candidate.quality.freshDominatedMoves * 150;
  const shortWordPenalty = candidate.quality.shortWords * 260;
  const diagonalPenalty = Math.abs(diagonalRatio - 0.45) * 500;

  return (
    candidate.quality.score +
    uniqueMoves.length * 180 +
    deepMoves * 85 +
    longDeepMoves * 260 +
    candidate.quality.mixedMoves * 160 +
    candidate.quality.mixedMoveScore * 4 +
    candidate.quality.areaScore * 10 +
    rowCoverage * 95 +
    colCoverage * 95 -
    scarcityPenalty -
    directionPenalty -
    deepPenalty -
    coveragePenalty -
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
      candidate.quality.shortWords <= Math.max(3, Math.floor(uniqueWords * 0.4)) &&
      candidate.quality.topBandHorizontalMoves <=
        Math.max(2, Math.floor(uniqueWords * 0.2))
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
      ? createSmartCandidateSlots(collapsedSlots, injectionOptions)
      : cloneSlots(collapsedSlots);
  let bestBoard = fillRandomSlots(firstSlots);
  let bestQuality = scoreWordWaveBoard(bestBoard, scoreContext);
  const candidates: ScoredWordWaveCandidate[] = [];

  addRefillCandidate(candidates, {board: bestBoard, quality: bestQuality});

  for (let attempts = 1; attempts <= candidateAttempts; attempts += 1) {
    const candidateSlots =
      injectionOptions.length > 0 && attempts % 6 !== 0
        ? createSmartCandidateSlots(collapsedSlots, injectionOptions)
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

  if (
    injectedWords.length > 0 &&
    forecastBest.board === injectedBoard &&
    (isBoardQualityPlayable(injectedQuality) || !isBoardQualityPlayable(bestQuality))
  ) {
    return {
      board: injectedBoard,
      moves: injectedQuality.moves,
      attempts: candidateAttempts + 1,
      injectedWord: injectedWords.join(', ') || undefined,
    };
  }

  return {
    board: bestBoard,
    moves: bestQuality.moves,
    attempts: candidateAttempts + 2,
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
