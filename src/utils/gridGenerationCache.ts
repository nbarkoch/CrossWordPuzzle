import {GRID_DIMENSIONS} from './blockCalcs';
import {generateLetterGrid, getDateSeed} from './generate';
import {CategorySelection, GameMode, GridSize} from './types';
import {wordsDictionary} from '~/data/english';

type IdleCallbackHandle = ReturnType<typeof setTimeout>;
type IdleCallbackOptions = {timeout?: number};

declare const requestIdleCallback:
  | ((
      callback: () => void,
      options?: IdleCallbackOptions,
    ) => IdleCallbackHandle)
  | undefined;
declare const cancelIdleCallback:
  | ((handle: IdleCallbackHandle) => void)
  | undefined;

export type GridGenerationRequest = {
  category: CategorySelection;
  gridSize: GridSize;
  mode: GameMode;
};

export type GeneratedGridConfig = {
  gridRows: number;
  gridCols: number;
  letterGrid: string[][];
  placedWords: string[];
  normalizedPlacedWords: string[];
  gridHorizontalPadding: number;
};

export type GridGenerationResult =
  | {
      gridData: GeneratedGridConfig;
      error: null;
    }
  | {
      gridData: null;
      error: string;
    };

type PreparedGridEntry = {
  promise: Promise<GridGenerationResult>;
  result?: GridGenerationResult;
};

const preparedGrids = new Map<string, PreparedGridEntry>();

const getGridKey = ({category, gridSize, mode}: GridGenerationRequest) => {
  const dailySeed = mode === 'daily' ? getDateSeed() : 'random';
  return `${mode}:${category}:${gridSize}:${dailySeed}`;
};

const scheduleIdle = (callback: () => void) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, {timeout: 500});
    return () => cancelIdleCallback?.(id);
  }

  const id = setTimeout(callback, 0);
  return () => clearTimeout(id);
};

const generateGrid = ({
  category,
  gridSize,
  mode,
}: GridGenerationRequest): GridGenerationResult => {
  try {
    const {gridRows, gridCols, gridHorizontalPadding} =
      GRID_DIMENSIONS[gridSize];
    const {grid, placedWords, normalizedPlacedWords} = generateLetterGrid(
      gridCols,
      gridRows,
      wordsDictionary[category],
      mode === 'daily',
    );

    if (grid.length === 0) {
      return {
        gridData: null,
        error: 'Failed to generate grid. Please try again.',
      };
    }

    return {
      gridData: {
        gridRows,
        gridCols,
        letterGrid: grid,
        placedWords,
        normalizedPlacedWords,
        gridHorizontalPadding,
      },
      error: null,
    };
  } catch ($error) {
    console.error('Grid generation error:', $error);
    return {
      gridData: null,
      error: 'Unexpected error occurred. Please try again.',
    };
  }
};

const scheduleGridGeneration = (
  request: GridGenerationRequest,
): Promise<GridGenerationResult> =>
  new Promise(resolve => {
    scheduleIdle(() => resolve(generateGrid(request)));
  });

export const prepareGrid = (request: GridGenerationRequest) => {
  const key = getGridKey(request);
  const currentEntry = preparedGrids.get(key);

  if (currentEntry) {
    return currentEntry.promise;
  }

  const entry: PreparedGridEntry = {
    promise: scheduleGridGeneration(request),
  };

  entry.promise.then(result => {
    if (preparedGrids.get(key) === entry) {
      entry.result = result;
    }
  });

  preparedGrids.set(key, entry);
  return entry.promise;
};

export const takePreparedGrid = (
  request: GridGenerationRequest,
): GridGenerationResult | null => {
  const key = getGridKey(request);
  const entry = preparedGrids.get(key);

  if (!entry?.result) {
    return null;
  }

  preparedGrids.delete(key);
  return entry.result;
};

export const generateGridOnIdle = (request: GridGenerationRequest) =>
  scheduleGridGeneration(request);
