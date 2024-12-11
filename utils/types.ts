export interface Position {
  row: number;
  col: number;
}

export type Direction = (typeof VALID_DIRECTIONS)[number];

export const VALID_DIRECTIONS = [
  {dx: 0, dy: -1},
  {dx: 1, dy: -1},
  {dx: 1, dy: 0},
  {dx: 1, dy: 1},
  {dx: 0, dy: 1},
  {dx: -1, dy: 1},
  {dx: -1, dy: 0},
  {dx: -1, dy: -1},
];
