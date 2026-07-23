import React, {useEffect, useState, useCallback} from 'react';
import {StyleSheet, View, TouchableOpacity, Text} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LoadingAnimation from './LoadingAnimation';
import GridContent from './GridContent';
import {Banner} from './AdBanner';
import {CategorySelection, GameMode, GridSize, WordSequence} from '~/utils/types';
import {GRID_DIMENSIONS} from '~/utils/blockCalcs';
import {BLOCK_SIZES, GRID_FRAME_PADDING, GRID_TOP} from '~/utils/consts';
import {
  GeneratedGridConfig,
  generateGridOnIdle,
  prepareGrid,
  takePreparedGrid,
} from '~/utils/gridGenerationCache';
import {loadSavedGame} from '~/utils/gameStorage';

type GridConfig = GeneratedGridConfig;

interface LoadingProps {
  gridDimensions: {
    width: number;
    height: number;
  };
  gridHorizontalPadding: number;
}

const LoadingFallback = ({
  gridDimensions,
  gridHorizontalPadding,
}: LoadingProps) => {
  return (
    <View
      style={[
        styles.gridShadowContainer,
        {
          top: GRID_TOP,
          left: gridHorizontalPadding,
          width: gridDimensions.width,
          height: gridDimensions.height,
        },
      ]}>
      <View style={styles.gridFrame} />
      <View style={styles.gridContainer}>
        <LoadingAnimation />
      </View>
    </View>
  );
};

const initialGridData: GridConfig = {
  gridRows: 0,
  gridCols: 0,
  letterGrid: [],
  placedWords: [],
  normalizedPlacedWords: [],
  gridHorizontalPadding: 0,
};

type GridLettersProps = {
  goToMenu: () => void;
  gridSize: GridSize;
  category: CategorySelection;
  mode: GameMode;
  resume?: boolean;
};

export default function GridLetters({
  mode,
  gridSize,
  goToMenu,
  category,
  resume = false,
}: GridLettersProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [gridData, setGridData] = useState<GridConfig>(initialGridData);
  const [initialSequences, setInitialSequences] = useState<WordSequence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState<number>(0);

  // Calculate basic dimensions before any generation
  const preDimensions = GRID_DIMENSIONS[gridSize];
  const blockSize = BLOCK_SIZES[gridSize];

  // Reset game function
  const resetGame = useCallback(() => {
    setGameKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Only resume from storage on the very first mount (gameKey === 0).
    // Any reset (Play Again) starts a fresh, freshly-generated game.
    const shouldResume = resume && gameKey === 0;

    const loadGrid = async () => {
      if (shouldResume) {
        const saved = await loadSavedGame(mode as 'classic' | 'daily');
        if (saved) {
          if (!isMounted) {
            return;
          }
          setGridData(saved.gridData);
          setInitialSequences(saved.sequences);
          setIsLoading(false);
          return;
        }
      }

      const gridRequest = {category, gridSize, mode};
      const preparedGrid = gameKey === 0 ? takePreparedGrid(gridRequest) : null;
      const result = await (preparedGrid
        ? Promise.resolve(preparedGrid)
        : gameKey === 0
          ? prepareGrid(gridRequest)
          : generateGridOnIdle(gridRequest));

      if (!isMounted) {
        return;
      }

      if (result.gridData) {
        setInitialSequences([]);
        setGridData(result.gridData);
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    };

    loadGrid();

    return () => {
      isMounted = false;
    };
  }, [gameKey, gridSize, mode, category, resume]);

  const hasValidGrid = gridData.letterGrid.length > 0 && !isLoading && !error;
  const loadingDimensions = {
    width: preDimensions.width,
    height: preDimensions.height,
  };

  return (
    <LinearGradient
      style={styles.container}
      colors={['#4B21A6', '#8043E9', '#9f4ef1', '#4B21A6']}>
      {isLoading ? (
        <LoadingFallback
          gridDimensions={loadingDimensions}
          gridHorizontalPadding={preDimensions.gridHorizontalPadding}
        />
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={resetGame}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        hasValidGrid && (
          <GridContent
            key={gameKey}
            gridData={gridData}
            blockSize={blockSize}
            onGoHome={goToMenu}
            onGameReset={resetGame}
            gridSize={gridSize}
            category={category}
            mode={mode}
            initialSequences={initialSequences}
          />
        )
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Banner.height,
  },
  gridShadowContainer: {
    position: 'absolute',
  },
  gridFrame: {
    ...StyleSheet.absoluteFill,
    margin: -GRID_FRAME_PADDING,
    backgroundColor: '#DECCF8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B99DEF',
    shadowColor: '#2D126D',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 8,
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#d4c4ea',
    borderColor: '#cdb8eb',
    shadowColor: '#410747',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 5,
  },
  errorContainer: {
    position: 'absolute',
    top: GRID_TOP,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#FF3B30',
  },
  retryButton: {
    backgroundColor: '#6F54FB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
