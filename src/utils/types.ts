import {VALID_DIRECTIONS} from './consts';

export interface Position {
  row: number;
  col: number;
}

export type Direction = (typeof VALID_DIRECTIONS)[number];

export type WordSequence = {
  blocks: Position[];
  word: string;
  start: Position;
  end: Position;
  direction: Direction;
};

export const CATEGORIES = [
  'general',
  'animals',
  'sports',
  'food',
  'science',
  'geography',
  'movies',
  'music',
  'tech',
  'nature',
  'art',
  'space',
  'history',
] as const;

export type CategorySelection = (typeof CATEGORIES)[number];

export const GRID_TYPE_SIZES = ['small', 'medium', 'large'] as const;
export type GridSize = (typeof GRID_TYPE_SIZES)[number];
export type GameMode = 'classic' | 'daily' | 'challenge';
