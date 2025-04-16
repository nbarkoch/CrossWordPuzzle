import {Dimensions} from 'react-native';
import {Direction, Position, WordSequence} from './types';
import {BLOCK_SIZES, GRID_BOTTOM, GRID_HORIZONTAL} from './consts';

const {width, height} = Dimensions.get('screen');

const calculateGridConfig = (blockSize: number) => ({
  rows: Math.floor((height - GRID_BOTTOM) / blockSize),
  cols: Math.floor((width - GRID_HORIZONTAL) / blockSize),
  blockSize,
});

export const GRID_SIZES = {
  large: calculateGridConfig(BLOCK_SIZES.large),
  medium: calculateGridConfig(BLOCK_SIZES.medium),
  small: calculateGridConfig(BLOCK_SIZES.small),
};

const preDimensions = (blockSize: number) => {
  const gridRows = Math.floor((height - GRID_BOTTOM) / blockSize);
  const gridCols = Math.floor((width - GRID_HORIZONTAL) / blockSize);
  const gridWidth = gridCols * blockSize;
  const gridHeight = gridRows * blockSize;

  return {
    gridRows,
    gridCols,
    gridHorizontalPadding: (width - gridWidth) / 2,
    width: gridWidth,
    height: gridHeight,
  };
};

export const GRID_DIMENSIONS = {
  large: preDimensions(BLOCK_SIZES.large),
  medium: preDimensions(BLOCK_SIZES.medium),
  small: preDimensions(BLOCK_SIZES.small),
};

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
    if (words[i] === word) {
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
    if (foundSequences[i].word === word) {
      return false;
    }
  }

  return true;
};
