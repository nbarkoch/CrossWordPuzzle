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
