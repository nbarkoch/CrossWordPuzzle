import {VALID_DIRECTIONS} from './consts';
import {Direction, Position} from './types';

/**
 * Creates a seeded random number generator for deterministic results
 * @param seed The seed value to use (optional)
 * @returns A function that generates pseudo-random numbers between 0 and 1
 */
const createRandom = (seed?: number) => {
  // If no seed provided, use Math.random
  if (seed === undefined) {
    return Math.random;
  }

  // Otherwise, use a seeded random function
  let currentSeed = seed;
  return () => {
    // Simple LCG (Linear Congruential Generator)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    // Update seed for next call (mutating the closure variable)
    currentSeed = (a * currentSeed + c) % m;

    // Return a value between 0 and 1
    return currentSeed / m;
  };
};

/**
 * Normalizes a word by removing spaces and converting to uppercase
 * @param word The word to normalize
 * @returns The normalized word
 */
export const normalizeWord = (word: string) =>
  word.replace(/\s+/g, '').toUpperCase();

/**
 * Generates decoy patterns based on placed words
 * @param word The word to create a decoy for
 * @param random Random function (seeded or not)
 * @returns A decoy pattern
 */
const generateDecoyPattern = (word: string, random: () => number): string => {
  // Strategy 1: Replace one or two letters
  if (random() < 0.3) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = word.split('');
    const positions = random() < 0.5 ? 1 : 2;

    for (let i = 0; i < positions; i++) {
      const pos = Math.floor(random() * word.length);
      result[pos] = letters[Math.floor(random() * letters.length)];
    }
    return result.join('');
  }

  // Strategy 2: Rearrange letters
  if (random() < 0.3) {
    const chars = word.split('');
    // Fisher-Yates shuffle using provided random function
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  // Strategy 3: Use common letter patterns
  const commonPatterns = {
    ING: ['IND', 'INK', 'IMG'],
    TION: ['SION', 'TIAN', 'CION'],
    ED: ['ES', 'ER', 'EL'],
    THE: ['THO', 'THA', 'THI'],
    AND: ['ANT', 'ANG', 'ANY'],
  };

  for (const [pattern, alternatives] of Object.entries(commonPatterns)) {
    if (word.includes(pattern)) {
      const randomAlt =
        alternatives[Math.floor(random() * alternatives.length)];
      return word.replace(pattern, randomAlt);
    }
  }

  // Strategy 4: Create similar looking sequences
  const similarLetters: Record<string, string[]> = {
    A: ['O', 'R'],
    E: ['F', 'B'],
    I: ['L', 'T'],
    O: ['Q', 'D'],
    S: ['Z', '5'],
    B: ['R', 'P'],
    M: ['N', 'W'],
  };

  let result = '';
  for (const char of word) {
    const upperChar = char.toUpperCase();
    if (upperChar in similarLetters && random() < 0.3) {
      const alternatives =
        similarLetters[upperChar as keyof typeof similarLetters];
      result += alternatives[Math.floor(random() * alternatives.length)];
    } else {
      result += upperChar;
    }
  }
  return result;
};

type PlacementCandidate = {
  word: string;
  normalizedWord: string;
  position: Position;
  direction: Direction;
  score: number;
};

type WordCandidate = {
  word: string;
  normalizedWord: string;
};

const WORD_SAMPLE_SIZE = 50;
const TARGET_OVERLAP_RATIO = 0.35;
const MAX_COMFORTABLE_OVERLAP_RATIO = 0.55;
const playableWordsCache = new WeakMap<string[], Map<number, WordCandidate[]>>();

const reverseWord = (word: string) => word.split('').reverse().join('');

const getDirectionKey = (direction: Direction) =>
  `${direction.dx},${direction.dy}`;

const createDirectionCounts = () =>
  Object.fromEntries(
    VALID_DIRECTIONS.map(direction => [getDirectionKey(direction), 0]),
  ) as Record<string, number>;

const getPlayableWords = (
  words: string[],
  maxLength: number,
): WordCandidate[] => {
  const cachedByLength = playableWordsCache.get(words);
  const cachedWords = cachedByLength?.get(maxLength);

  if (cachedWords) {
    return cachedWords;
  }

  const uniqueWords = new Map<string, string>();

  words.forEach(word => {
    const normalizedWord = normalizeWord(word);

    if (normalizedWord.length > 1 && normalizedWord.length <= maxLength) {
      uniqueWords.set(normalizedWord, word);
    }
  });

  const candidates = [...uniqueWords.entries()].map(
    ([normalizedWord, word]) => ({
      word,
      normalizedWord,
    }),
  );

  const playableWords = candidates.filter(
    candidate =>
      !candidates.some(other => {
        if (other.normalizedWord === candidate.normalizedWord) {
          return false;
        }

        return (
          other.normalizedWord.includes(candidate.normalizedWord) ||
          reverseWord(other.normalizedWord).includes(candidate.normalizedWord)
        );
      }),
  );

  if (cachedByLength) {
    cachedByLength.set(maxLength, playableWords);
  } else {
    playableWordsCache.set(words, new Map([[maxLength, playableWords]]));
  }

  return playableWords;
};

const sampleWords = (
  words: WordCandidate[],
  random: () => number,
  sampleSize: number,
) => {
  const pool = [...words];
  const sample: WordCandidate[] = [];

  while (pool.length > 0 && sample.length < sampleSize) {
    const index = Math.floor(random() * pool.length);
    sample.push(pool[index]);
    pool.splice(index, 1);
  }

  return sample;
};

const shufflePlacedWordPairs = (
  placedWords: string[],
  normalizedPlacedWords: string[],
  random: () => number,
) => {
  const wordPairs = placedWords.map((word, index) => ({
    word,
    normalizedWord: normalizedPlacedWords[index],
  }));

  for (let i = wordPairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [wordPairs[i], wordPairs[j]] = [wordPairs[j], wordPairs[i]];
  }

  return {
    placedWords: wordPairs.map(pair => pair.word),
    normalizedPlacedWords: wordPairs.map(pair => pair.normalizedWord),
  };
};

const scorePlacement = (
  grid: string[][],
  word: string,
  position: Position,
  direction: Direction,
  directionCounts: Record<string, number>,
  placedWordCount: number,
  random: () => number,
) => {
  let overlappingLetters = 0;
  let emptyLetters = 0;

  for (let i = 0; i < word.length; i++) {
    const row = position.row + direction.dy * i;
    const col = position.col + direction.dx * i;
    const currentCell = grid[row][col];

    if (currentCell === word[i]) {
      overlappingLetters += 1;
    } else {
      emptyLetters += 1;
    }
  }

  const directionCount = directionCounts[getDirectionKey(direction)] || 0;
  const expectedDirectionCount =
    (placedWordCount + 1) / VALID_DIRECTIONS.length;
  const directionBalanceScore = (expectedDirectionCount - directionCount) * 250;
  const overlapRatio = overlappingLetters / word.length;
  const overlapScore =
    Math.min(overlappingLetters, 3) * 500 +
    Math.max(0, overlappingLetters - 3) * 120;
  const fillScore = emptyLetters * 90;
  const overlapBalancePenalty =
    Math.abs(overlapRatio - TARGET_OVERLAP_RATIO) * 180;
  const overCollisionPenalty =
    overlapRatio > MAX_COMFORTABLE_OVERLAP_RATIO
      ? (overlapRatio - MAX_COMFORTABLE_OVERLAP_RATIO) * 1200
      : 0;

  return (
    overlapScore +
    fillScore +
    directionBalanceScore -
    overlapBalancePenalty -
    overCollisionPenalty +
    random()
  );
};

/**
 * Finds the strongest valid placement from a sampled word set.
 * The scoring favors matching-letter overlaps, then spread.
 * @param grid The current grid
 * @param words Words to try
 * @param random Random function to use
 * @returns A valid position and direction, or null if placement fails
 */
const findValidPlacement = (
  grid: string[][],
  words: WordCandidate[],
  directionCounts: Record<string, number>,
  placedWordCount: number,
  random: () => number,
): PlacementCandidate | null => {
  const gridRows = grid.length;
  const gridCols = grid[0].length;
  let bestCandidate: PlacementCandidate | null = null;

  for (const wordCandidate of words) {
    const wordLength = wordCandidate.normalizedWord.length;

    for (const direction of VALID_DIRECTIONS) {
      const minRow =
        direction.dy < 0 ? wordLength - 1 : direction.dy > 0 ? 0 : 0;
      const maxRow =
        direction.dy > 0
          ? gridRows - wordLength
          : direction.dy < 0
            ? gridRows - 1
            : gridRows - 1;
      const minCol =
        direction.dx < 0 ? wordLength - 1 : direction.dx > 0 ? 0 : 0;
      const maxCol =
        direction.dx > 0
          ? gridCols - wordLength
          : direction.dx < 0
            ? gridCols - 1
            : gridCols - 1;

      if (minRow > maxRow || minCol > maxCol) {
        continue;
      }

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const position = {row, col};

          if (
            canPlaceWord(
              grid,
              wordCandidate.normalizedWord,
              position,
              direction,
            )
          ) {
            const candidate = {
              word: wordCandidate.word,
              normalizedWord: wordCandidate.normalizedWord,
              position,
              direction,
              score: scorePlacement(
                grid,
                wordCandidate.normalizedWord,
                position,
                direction,
                directionCounts,
                placedWordCount,
                random,
              ),
            };

            if (!bestCandidate || candidate.score > bestCandidate.score) {
              bestCandidate = candidate;
            }
          }
        }
      }
    }
  }

  return bestCandidate;
};

/**
 * Places a word on the grid at the specified position and direction
 * @param grid The grid to place the word on
 * @param word The word to place
 * @param start The starting position
 * @param direction The direction to place the word
 */
const placeWord = (
  grid: string[][],
  word: string,
  start: Position,
  direction: Direction,
): void => {
  for (let i = 0; i < word.length; i++) {
    const row = start.row + direction.dy * i;
    const col = start.col + direction.dx * i;
    grid[row][col] = word[i];
  }
};

/**
 * Checks if a word can be placed at the specified position and direction
 * @param grid The current grid
 * @param word The word to check
 * @param start The starting position
 * @param direction The direction to check
 * @returns Whether the word can be placed
 */
const canPlaceWord = (
  grid: string[][],
  word: string,
  start: Position,
  direction: Direction,
): boolean => {
  const gridRows = grid.length;
  const gridCols = grid[0].length;

  // Check if word fits within grid bounds
  const endRow = start.row + direction.dy * (word.length - 1);
  const endCol = start.col + direction.dx * (word.length - 1);

  if (endRow < 0 || endRow >= gridRows || endCol < 0 || endCol >= gridCols) {
    return false;
  }

  // Check if word can be placed (empty cells or matching letters)
  for (let i = 0; i < word.length; i++) {
    const currentRow = start.row + direction.dy * i;
    const currentCol = start.col + direction.dx * i;
    const currentCell = grid[currentRow][currentCol];

    if (currentCell !== '' && currentCell !== word[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Fills remaining spaces in the grid with letters
 * @param grid The grid to fill
 * @param placedWords The words that have been placed
 * @param gridRows The number of rows in the grid
 * @param gridCols The number of columns in the grid
 * @param random Random function to use
 */
const fillRemainingSpaces = (
  grid: string[][],
  placedWords: string[],
  gridRows: number,
  gridCols: number,
  random: () => number,
): void => {
  // First, add decoy patterns based on placed words
  for (const word of placedWords) {
    const attempts = 2; // Try to place 2 decoy patterns per word
    for (let i = 0; i < attempts; i++) {
      const decoyWord = generateDecoyPattern(word, random);
      // Try to place the decoy pattern
      for (let attempt = 0; attempt < 10; attempt++) {
        const position = {
          row: Math.floor(random() * gridRows),
          col: Math.floor(random() * gridCols),
        };
        const direction = {
          dx: [-1, 0, 1][Math.floor(random() * 3)],
          dy: [-1, 0, 1][Math.floor(random() * 3)],
        };

        if (direction.dx === 0 && direction.dy === 0) {
          continue;
        }

        // Check if we can place the decoy
        let canPlace = true;
        const positions: [number, number][] = [];

        for (let j = 0; j < decoyWord.length; j++) {
          const row = position.row + direction.dy * j;
          const col = position.col + direction.dx * j;

          if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) {
            canPlace = false;
            break;
          }

          if (grid[row][col] !== '') {
            canPlace = false;
            break;
          }

          positions.push([row, col]);
        }

        if (canPlace) {
          // Place the decoy word
          for (let j = 0; j < positions.length; j++) {
            const [row, col] = positions[j];
            grid[row][col] = decoyWord[j];
          }
          break;
        }
      }
    }
  }

  // Create letter frequency table from placed words
  const letterFrequency: Record<string, number> = {};
  placedWords.forEach(word => {
    word.split('').forEach(letter => {
      letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
    });
  });

  const letters = Object.keys(letterFrequency);
  const weights = Object.values(letterFrequency);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Fill remaining empty spaces with weighted random letters
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (grid[row][col] === '') {
        // Use weighted random selection based on letter frequency
        if (random() < 0.7) {
          // 70% chance to use weighted selection
          const rand = random() * totalWeight;
          let sum = 0;
          let selectedLetter = 'A';

          for (let i = 0; i < letters.length; i++) {
            sum += weights[i];
            if (rand <= sum) {
              selectedLetter = letters[i];
              break;
            }
          }
          grid[row][col] = selectedLetter;
        } else {
          // 30% chance to use completely random letter
          grid[row][col] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[
            Math.floor(random() * 26)
          ];
        }
      }
    }
  }
};

/**
 * Gets a numeric seed from a date
 * @param date A Date object
 * @returns A numeric seed in the format YYYYMMDD
 */
export const getDateSeed = (date: Date = new Date()): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-indexed
  const day = date.getDate();

  // Create a numeric seed from the date: YYYYMMDD
  return year * 10000 + month * 100 + day;
};

/**
 * Generates a letter grid for word search puzzles
 * @param gridCols Number of columns in the grid
 * @param gridRows Number of rows in the grid
 * @param words List of words to place in the grid
 * @param isDaily Whether to generate a deterministic grid for daily challenges
 * @param customSeed Optional custom seed for deterministic generation (only used if isDaily is true)
 * @returns Generated grid, placed words, and normalized placed words
 */
export const generateLetterGrid = (
  gridCols: number,
  gridRows: number,
  words: string[],
  isDaily: boolean = false,
  density: number = 0.5,
): {
  grid: string[][];
  placedWords: string[];
  normalizedPlacedWords: string[];
} => {
  // Create random function - either seeded or Math.random
  const seed = isDaily ? getDateSeed() : undefined;
  const random = createRandom(seed);

  // Initialize empty grid
  const grid: string[][] = Array(gridRows)
    .fill('')
    .map(() => Array(gridCols).fill(''));

  const validWords = getPlayableWords(words, Math.max(gridRows, gridCols));

  if (validWords.length === 0) {
    throw new Error('No valid words provided for the grid size');
  }

  const maxWords = Math.max(3, Math.floor(gridRows * gridCols * density));

  // If isDaily, we want a deterministic shuffle
  const shuffledWords = [...validWords];
  if (isDaily) {
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffledWords.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffledWords[i], shuffledWords[j]] = [
        shuffledWords[j],
        shuffledWords[i],
      ];
    }
  } else {
    // Regular shuffle for normal mode
    shuffledWords.sort(() => random() - 0.5);
  }

  const limitedShuffledWords = shuffledWords
    .slice(0, maxWords * 4)
    .sort((a, b) => b.normalizedWord.length - a.normalizedWord.length);

  const placedWords: string[] = [];
  const directionCounts = createDirectionCounts();
  let remainingAttempts = limitedShuffledWords.length * 2;

  // Try to place words until we run out of attempts, words, or reach maxWords
  while (
    remainingAttempts > 0 &&
    limitedShuffledWords.length > 0 &&
    placedWords.length < maxWords
  ) {
    const sampledWords = sampleWords(
      limitedShuffledWords,
      random,
      WORD_SAMPLE_SIZE,
    );

    const placement = findValidPlacement(
      grid,
      sampledWords,
      directionCounts,
      placedWords.length,
      random,
    );

    if (placement) {
      placeWord(
        grid,
        placement.normalizedWord,
        placement.position,
        placement.direction,
      );
      placedWords.push(placement.word);
      directionCounts[getDirectionKey(placement.direction)] += 1;
      const placedWordIndex = limitedShuffledWords.findIndex(
        candidate => candidate.normalizedWord === placement.normalizedWord,
      );

      if (placedWordIndex >= 0) {
        limitedShuffledWords.splice(placedWordIndex, 1);
      }

      remainingAttempts = limitedShuffledWords.length * 2;
    } else {
      const skippedWord = limitedShuffledWords.shift();

      if (skippedWord) {
        limitedShuffledWords.push(skippedWord);
      }

      remainingAttempts--;
    }
  }

  if (placedWords.length === 0) {
    throw new Error('Could not place any words in grid');
  }

  const normalizedPlacedWords = placedWords.map(normalizeWord);

  // Fill remaining spaces
  fillRemainingSpaces(grid, normalizedPlacedWords, gridRows, gridCols, random);

  const shuffledPlacedWords = shufflePlacedWordPairs(
    placedWords,
    normalizedPlacedWords,
    random,
  );

  return {grid, ...shuffledPlacedWords};
};

/**
 * Generates today's daily challenge grid
 * @param gridCols Number of columns in the grid
 * @param gridRows Number of rows in the grid
 * @param words List of words to place in the grid
 * @returns Generated grid for today's daily challenge
 */
export const generateTodaysDailyGrid = (
  gridCols: number,
  gridRows: number,
  words: string[],
) => {
  return generateLetterGrid(gridCols, gridRows, words, true);
};
