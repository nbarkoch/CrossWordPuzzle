import AsyncStorage from '@react-native-async-storage/async-storage';

import {GeneratedGridConfig} from './gridGenerationCache';
import {CategorySelection, GridSize, WordSequence} from './types';

export type SavedGameMode = 'classic' | 'daily';

export type SavedGame = {
  mode: SavedGameMode;
  category: CategorySelection;
  gridSize: GridSize;
  gridData: GeneratedGridConfig;
  sequences: WordSequence[];
  completed: boolean;
  /** Only set for daily games: the YYYYMMDD seed the grid was generated for. */
  dateSeed?: number;
  savedAt: number;
};

const STORAGE_KEYS: Record<SavedGameMode, string> = {
  classic: '@saved_game/classic',
  daily: '@saved_game/daily',
};

const WORD_WAVE_BEST_SCORE_KEY = '@word_wave/best_score';

const LAST_GAME_OPTIONS_KEY = '@game_options/last_choice';

export type LastGameOptions = {
  category: CategorySelection;
  gridSize: GridSize;
};

export const loadLastGameOptions =
  async (): Promise<LastGameOptions | null> => {
    try {
      const raw = await AsyncStorage.getItem(LAST_GAME_OPTIONS_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<LastGameOptions>;
      if (!parsed?.category || !parsed?.gridSize) {
        return null;
      }
      return {category: parsed.category, gridSize: parsed.gridSize};
    } catch (error) {
      console.error('Failed to load last game options:', error);
      return null;
    }
  };

export const saveLastGameOptions = async (
  options: LastGameOptions,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      LAST_GAME_OPTIONS_KEY,
      JSON.stringify(options),
    );
  } catch (error) {
    console.error('Failed to save last game options:', error);
  }
};

export const loadWordWaveBestScore = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(WORD_WAVE_BEST_SCORE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    console.error('Failed to load Word Wave best score:', error);
    return 0;
  }
};

export const saveWordWaveBestScore = async (score: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(WORD_WAVE_BEST_SCORE_KEY, String(score));
  } catch (error) {
    console.error('Failed to save Word Wave best score:', error);
  }
};

export const loadSavedGame = async (
  mode: SavedGameMode,
): Promise<SavedGame | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS[mode]);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SavedGame;
    // Guard against corrupt / partial payloads.
    if (!parsed?.gridData?.letterGrid?.length) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load saved game:', error);
    return null;
  }
};

export const saveGame = async (game: SavedGame): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS[game.mode], JSON.stringify(game));
  } catch (error) {
    console.error('Failed to save game:', error);
  }
};

export const clearSavedGame = async (mode: SavedGameMode): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS[mode]);
  } catch (error) {
    console.error('Failed to clear saved game:', error);
  }
};
