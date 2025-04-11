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

export const SEQUENCE_COLORS = [
  {active: 'rgba(255, 111, 145, 0.3)', saved: 'rgba(255, 111, 145, 0.5)'}, // Rose Pink
  {active: 'rgba(86, 204, 242, 0.3)', saved: 'rgba(86, 204, 242, 0.5)'}, // Sky Blue
  {active: 'rgba(255, 179, 71, 0.3)', saved: 'rgba(255, 179, 71, 0.5)'}, // Marigold
  {active: 'rgba(183, 110, 255, 0.3)', saved: 'rgba(183, 110, 255, 0.5)'}, // Lavender
  {active: 'rgba(255, 145, 77, 0.3)', saved: 'rgba(255, 145, 77, 0.5)'}, // Coral
  {active: 'rgba(77, 198, 171, 0.3)', saved: 'rgba(77, 198, 171, 0.5)'}, // Seafoam
  {active: 'rgba(255, 166, 193, 0.3)', saved: 'rgba(255, 166, 193, 0.5)'}, // Bubblegum
  {active: 'rgba(126, 217, 87, 0.3)', saved: 'rgba(126, 217, 87, 0.5)'}, // Lime
  {active: 'rgba(255, 198, 115, 0.3)', saved: 'rgba(255, 198, 115, 0.5)'}, // Peach
  {active: 'rgba(95, 177, 255, 0.3)', saved: 'rgba(95, 177, 255, 0.5)'}, // Azure
  {active: 'rgba(255, 130, 130, 0.3)', saved: 'rgba(255, 130, 130, 0.5)'}, // Salmon
  {active: 'rgba(147, 197, 114, 0.3)', saved: 'rgba(147, 197, 114, 0.5)'}, // Sage
];

export const CATEGORIES_ICONS: Record<CategorySelection, string> = {
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
const GRID_TOP = 60;
const GRID_BOTTOM = 300;
const INITIAL_DIRECTION = VALID_DIRECTIONS[0];

export {GRID_HORIZONTAL, GRID_TOP, GRID_BOTTOM, INITIAL_DIRECTION};

const MIN_TAP_SIZE = Platform.select({
  ios: 44,
  android: 48,
  default: 48,
});

export const BLOCK_SIZES = {
  large: MIN_TAP_SIZE,
  medium: 52,
  small: 60,
};
