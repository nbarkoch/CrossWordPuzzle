import {VALID_DIRECTIONS} from './consts';
import {Direction, Position} from './types';

const generateDecoyPattern = (word: string): string => {
  // Strategy 1: Replace one or two letters
  if (Math.random() < 0.3) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = word.split('');
    const positions = Math.random() < 0.5 ? 1 : 2;

    for (let i = 0; i < positions; i++) {
      const pos = Math.floor(Math.random() * word.length);
      result[pos] = letters[Math.floor(Math.random() * letters.length)];
    }
    return result.join('');
  }

  // Strategy 2: Rearrange letters
  if (Math.random() < 0.3) {
    return word
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
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
        alternatives[Math.floor(Math.random() * alternatives.length)];
      return word.replace(pattern, randomAlt);
    }
  }

  // Strategy 4: Create similar looking sequences
  const similarLetters = {
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
    if (char in similarLetters && Math.random() < 0.3) {
      const alternatives = similarLetters[char as keyof typeof similarLetters];
      result += alternatives[Math.floor(Math.random() * alternatives.length)];
    } else {
      result += char;
    }
  }
  return result;
};

const findValidPlacement = (
  grid: string[][],
  word: string,
  maxAttempts: number = 100,
): {position: Position; direction: Direction} | null => {
  const gridRows = grid.length;
  const gridCols = grid[0].length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick random position
    const position = {
      row: Math.floor(Math.random() * gridRows),
      col: Math.floor(Math.random() * gridCols),
    };

    // Pick random direction
    const direction =
      VALID_DIRECTIONS[Math.floor(Math.random() * VALID_DIRECTIONS.length)];

    if (canPlaceWord(grid, word, position, direction)) {
      return {position, direction};
    }
  }

  return null;
};

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

const fillRemainingSpaces = (
  grid: string[][],
  placedWords: string[],
  gridRows: number,
  gridCols: number,
): void => {
  // First, add decoy patterns based on placed words
  for (const word of placedWords) {
    const attempts = 2; // Try to place 2 decoy patterns per word
    for (let i = 0; i < attempts; i++) {
      const decoyWord = generateDecoyPattern(word);
      // Try to place the decoy pattern
      for (let attempt = 0; attempt < 10; attempt++) {
        const position = {
          row: Math.floor(Math.random() * gridRows),
          col: Math.floor(Math.random() * gridCols),
        };
        const direction = {
          dx: [-1, 0, 1][Math.floor(Math.random() * 3)],
          dy: [-1, 0, 1][Math.floor(Math.random() * 3)],
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

  // Fill remaining empty spaces with weighted random letters
  // Use letter frequencies similar to the placed words
  const letterFrequency: Record<string, number> = {};
  placedWords.forEach(word => {
    word.split('').forEach(letter => {
      letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
    });
  });

  const letters = Object.keys(letterFrequency);
  const weights = Object.values(letterFrequency);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (grid[row][col] === '') {
        // Use weighted random selection based on letter frequency
        if (Math.random() < 0.7) {
          // 70% chance to use weighted selection
          const rand = Math.random() * totalWeight;
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
            Math.floor(Math.random() * 26)
          ];
        }
      }
    }
  }
};

export const normalizeWord = (word: string) =>
  word.replace(/\s+/g, '').toUpperCase();

// Update the original generateLetterGrid function to use the new fillRemainingSpaces
export const generateLetterGrid = (
  gridCols: number,
  gridRows: number,
  words: string[],
): {
  grid: string[][];
  placedWords: string[];
  normalizedPlacedWords: string[];
} => {
  const grid: string[][] = Array(gridRows)
    .fill('')
    .map(() => Array(gridCols).fill(''));

  const validWords = [...new Set(words)]
    .filter(word => word.length <= Math.max(gridRows, gridCols))
    .sort(() => Math.random() - 0.5);

  if (validWords.length === 0) {
    throw new Error('No valid words provided');
  }

  const placedWords: string[] = [];
  let remainingAttempts = validWords.length * 2;

  while (remainingAttempts > 0 && validWords.length > 0) {
    const randomIndex = Math.floor(Math.random() * validWords.length);
    const word = validWords[randomIndex];
    const normalizedWord = normalizeWord(word);

    const placement = findValidPlacement(grid, normalizedWord);

    if (placement) {
      placeWord(grid, normalizedWord, placement.position, placement.direction);
      placedWords.push(word);
      validWords.splice(randomIndex, 1);
      remainingAttempts = validWords.length * 2;
    } else {
      remainingAttempts--;
    }
  }

  if (placedWords.length === 0) {
    throw new Error('Could not place any words in grid');
  }
  const normalizedPlacedWords = placedWords.map(normalizeWord);

  // Use the new function to fill remaining spaces
  fillRemainingSpaces(grid, normalizedPlacedWords, gridRows, gridCols);

  return {grid, placedWords, normalizedPlacedWords};
};
