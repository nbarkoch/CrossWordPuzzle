/**
 * Word Wave analysis & simulation harness — DEVELOPMENT / TEST ONLY.
 *
 * None of this runs in the shipping game loop; it lives here to keep
 * wordWave.ts focused on the runtime engine. Engine internals that are private
 * to wordWave.ts are reached through its `__internal` bag so the runtime
 * module keeps a clean public surface.
 */
import {
  applyWordWaveTimedRowDrop,
  applyWordWaveTimedSelectionFast,
  createWordWaveBoard,
  findWordWaveMoves,
  getWordWaveArcadeScore,
  getWordWaveMoveScore,
  getWordWavePressureValue,
  refillWordWaveBoard,
  WORD_WAVE_SIZE,
  WordWaveBoard,
  WordWaveMove,
  WordWaveTimedPlayerLevel,
  WordWaveTimedWordResult,
  __internal,
} from './wordWave';

const {
  getUniqueMovesByWord,
  getMoveCoverage,
  scoreWordWaveBoard,
  getStaticRefillForecastScore,
  directionKey,
  getLocationBucketKey,
  isDiagonalDirection,
  repairWordWaveBoard,
  createSmartTimedTopRow,
  getPlayableSpread,
  WORD_WAVE_PLAYABLE_MIN_WORD_LENGTH,
  WORD_WAVE_PLAYABLE_MAX_WORD_LENGTH,
} = __internal;

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

const getRandomThinkSeconds = (config: TimedPlayerConfig) =>
  config.minThinkSeconds +
  Math.random() * (config.maxThinkSeconds - config.minThinkSeconds);

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

const getPlayableMoves = (board: WordWaveBoard) =>
  getUniqueMovesByWord(findWordWaveMoves(board)).filter(
    move =>
      move.word.length >= WORD_WAVE_PLAYABLE_MIN_WORD_LENGTH &&
      move.word.length <= WORD_WAVE_PLAYABLE_MAX_WORD_LENGTH,
  );

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

export type WordWaveRunReliabilityReport = {
  boards: number;
  waves: number;
  wordsPerWave: number;
  starvedThreshold: number;
  clusteredThreshold: number;
  // A run is "dead" if the board ever had zero playable 4-6 letter words.
  deadRuns: number;
  totalSteps: number;
  // --- Availability (how MANY words the player can act on) ---
  // Steps where playable words dropped below starvedThreshold (thin round).
  starvedSteps: number;
  starvedStepRate: number;
  // Worst single-step playable-word count seen across every run.
  minPlayableWords: number;
  // Averaged per-run worst — a proxy for "how thin does a run typically get".
  avgRunMinPlayableWords: number;
  avgPlayableWords: number;
  worstWave: number;
  // --- Spread (WHERE those words are — are they all in one corner?) ---
  // A beat's spread = number of distinct 3x3 zones (buckets, 1..9) touched by
  // the cells of the available words. Low = everything clustered in one place.
  avgSpreadBuckets: number;
  minSpreadBuckets: number;
  // Beats with words available but crammed into <= clusteredThreshold zones.
  clusteredSteps: number;
  clusteredStepRate: number;
  // Beats that are thin OR clustered — the "this feels risky" experience rate.
  riskySteps: number;
  riskyStepRate: number;
};

// Replays the EXACT shipping timed loop so we can judge long-run board health:
// a pick is resolved with applyWordWaveTimedSelectionFast (real tile removal +
// gravity collapse + fast refill) and each wave ends with applyWordWaveTimedRowDrop,
// mirroring WordWave.tsx. Unlike simulateWordWaveTimedGameplay (a repair-only
// pressure abstraction that never removes tiles), this measures whether the board
// the player actually sees keeps offering playable words — and whether those words
// stay spread across the grid rather than clustering in one zone — as waves
// increase. That is the signal we need before widening the window or adding waves.
export const simulateWordWaveRunReliability = (
  boards = 40,
  waves = 10,
  wordsPerWave = 2,
  starvedThreshold = 4,
  clusteredThreshold = 2,
): WordWaveRunReliabilityReport => {
  let deadRuns = 0;
  let totalSteps = 0;
  let starvedSteps = 0;
  let clusteredSteps = 0;
  let riskySteps = 0;
  let minPlayableWords = Number.POSITIVE_INFINITY;
  let minSpreadBuckets = Number.POSITIVE_INFINITY;
  let sumPlayableWords = 0;
  let sumSpreadBuckets = 0;
  let spreadBeats = 0;
  let sumRunMin = 0;
  let worstWave = 0;

  for (let boardIndex = 0; boardIndex < boards; boardIndex += 1) {
    let board = createWordWaveBoard();
    let runMin = Number.POSITIVE_INFINITY;
    let dead = false;

    for (let wave = 1; wave <= waves && !dead; wave += 1) {
      for (let pick = 0; pick < wordsPerWave; pick += 1) {
        const playableMoves = getPlayableMoves(board);
        const playable = playableMoves.length;
        const spread = getPlayableSpread(playableMoves);

        totalSteps += 1;
        sumPlayableWords += playable;
        runMin = Math.min(runMin, playable);

        const thin = playable < starvedThreshold;
        // Only judge spread when there are words to spread; a dead beat is
        // already counted as thin, not separately as clustered.
        const clustered = playable > 0 && spread <= clusteredThreshold;

        if (thin) {
          starvedSteps += 1;
        }
        if (clustered) {
          clusteredSteps += 1;
        }
        if (thin || clustered) {
          riskySteps += 1;
        }
        if (playable > 0) {
          sumSpreadBuckets += spread;
          spreadBeats += 1;
          minSpreadBuckets = Math.min(minSpreadBuckets, spread);
        }

        if (playable < minPlayableWords) {
          minPlayableWords = playable;
          worstWave = wave;
        }

        if (playable === 0) {
          dead = true;
          break;
        }

        const move = pickTimedPlayerMove(findWordWaveMoves(board), 'good');

        if (!move) {
          dead = true;
          break;
        }

        board = applyWordWaveTimedSelectionFast(
          board,
          move.path,
          move.word.length,
        ).board;
      }

      if (!dead) {
        board = applyWordWaveTimedRowDrop(board);
      }
    }

    if (dead) {
      deadRuns += 1;
    }

    sumRunMin += Number.isFinite(runMin) ? runMin : 0;
  }

  return {
    boards,
    waves,
    wordsPerWave,
    starvedThreshold,
    clusteredThreshold,
    deadRuns,
    totalSteps,
    starvedSteps,
    starvedStepRate: starvedSteps / Math.max(1, totalSteps),
    minPlayableWords: Number.isFinite(minPlayableWords) ? minPlayableWords : 0,
    avgRunMinPlayableWords: sumRunMin / Math.max(1, boards),
    avgPlayableWords: sumPlayableWords / Math.max(1, totalSteps),
    worstWave,
    avgSpreadBuckets: sumSpreadBuckets / Math.max(1, spreadBeats),
    minSpreadBuckets: Number.isFinite(minSpreadBuckets) ? minSpreadBuckets : 0,
    clusteredSteps,
    clusteredStepRate: clusteredSteps / Math.max(1, totalSteps),
    riskySteps,
    riskyStepRate: riskySteps / Math.max(1, totalSteps),
  };
};
