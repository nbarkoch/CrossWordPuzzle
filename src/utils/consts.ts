import {Platform} from 'react-native';
import {CategorySelection} from './types';

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

const withOpacity = (hexColor: string, opacity: number) => {
  const hex = hexColor.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const SEQUENCE_BASE_COLORS = [
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#22C55E', // Green
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
];

export const SEQUENCE_COLORS = SEQUENCE_BASE_COLORS.map(color => ({
  active: withOpacity(color, 0.2),
  saved: withOpacity(color, 0.5),
}));

export const CATEGORIES_ICONS: Record<CategorySelection, string> = {
  general: '🌐',
  animals: '🦁',
  sports: '⚽',
  food: '🍕',
  science: '🔬',
  geography: '🌍',
  movies: '🎬',
  music: '🎵',
  tech: '💻',
  nature: '🌿',
  art: '🎨',
  space: '🚀',
  history: '📜',
} as const;

const GRID_HORIZONTAL = 10;
const GRID_TOP = 80;
const GRID_BOTTOM = 270;
const INITIAL_DIRECTION = VALID_DIRECTIONS[0];

export {GRID_HORIZONTAL, GRID_TOP, GRID_BOTTOM, INITIAL_DIRECTION};

const MIN_TAP_SIZE = Platform.select({
  ios: 52,
  android: 48,
  default: 48,
});

const MID_TAP_SIZE = Platform.select({
  ios: 60,
  android: 52,
  default: 52,
});

const MAX_TAP_SIZE = Platform.select({
  ios: 70,
  android: 60,
  default: 60,
});

export const BLOCK_SIZES = {
  large: MIN_TAP_SIZE,
  medium: MID_TAP_SIZE,
  small: MAX_TAP_SIZE,
};
