import {Direction, Position, WordSequence} from './types';

// Calculate angle between two positions in degrees (0-360)
export const calculateAngle = (start: Position, end: Position): number => {
  'worklet';
  const dx = end.col - start.col;
  const dy = start.row - end.row;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (angle + 360) % 360;
};

// Update isDirectionValid to use the same boundary logic
export const isDirectionValid = (
  start: Position,
  direction: Direction,
  currentLength: number,
  gridCols: number,
  gridRows: number,
): boolean => {
  'worklet';
  const maxStepsX =
    direction.dx > 0
      ? gridCols - 1 - start.col
      : direction.dx < 0
      ? start.col
      : Infinity;

  const maxStepsY =
    direction.dy > 0
      ? gridRows - 1 - start.row
      : direction.dy < 0
      ? start.row
      : Infinity;

  const maxSteps = Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));

  return currentLength <= maxSteps;
};

// Modify your existing updateSelectedBlocks function to also update the word
export const updateSelectedBlocks = (
  start: Position,
  end: Position,
  direction: Direction,
  gridCols: number,
  gridRows: number,
): {blocks: Position[]; steps: number} => {
  'worklet';

  const maxStepsX =
    direction.dx > 0
      ? gridCols - 1 - start.col
      : direction.dx < 0
      ? start.col
      : Infinity;

  const maxStepsY =
    direction.dy > 0
      ? gridRows - 1 - start.row
      : direction.dy < 0
      ? start.row
      : Infinity;

  const maxSteps = Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));
  const requestedSteps = Math.max(
    Math.abs(end.col - start.col),
    Math.abs(end.row - start.row),
  );
  const steps = Math.min(requestedSteps, maxSteps);

  const blocks: Position[] = [];
  let currentRow = start.row;
  let currentCol = start.col;

  for (let i = 0; i <= steps; i++) {
    blocks.push({row: currentRow, col: currentCol});
    currentRow += direction.dy;
    currentCol += direction.dx;
  }

  return {steps, blocks};
};

export const getValidDirection = (
  start: Position,
  end: Position,
): Direction => {
  'worklet';
  const angle = calculateAngle(start, end);

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

export const isValidWord = (
  word: string,
  words: string[],
  foundSequences: WordSequence[],
): boolean => {
  'worklet';

  if (word.length < 2) {
    return false;
  }

  // Check if word exists in the provided words array
  let wordExists = false;
  for (let i = 0; i < words.length; i++) {
    if (words[i].toUpperCase() === word) {
      wordExists = true;
      break;
    }
  }

  if (!wordExists) {
    return false;
  }

  // Check if word has already been found
  // Note: Using a for loop instead of .some() for worklet compatibility
  for (let i = 0; i < foundSequences.length; i++) {
    if (foundSequences[i].word.toUpperCase() === word) {
      return false;
    }
  }

  return true;
};
