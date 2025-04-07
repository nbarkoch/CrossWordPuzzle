import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Dimensions,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import {generateLetterGrid} from '~/utils/generate';
import LinearGradient from 'react-native-linear-gradient';
import LoadingAnimation from './LoadingAnimation';
import {Banner} from './AdBanner';
import {CategorySelection, GridSize} from '~/utils/types';
const GridContent = React.lazy(() => import('./GridContent'));

type GridConfig = {
  gridRows: number;
  gridCols: number;
  letterGrid: string[][];
  placedWords: string[];
  normalizedPlacedWords: string[];
  gridHorizontalPadding: number;
};

const {width, height} = Dimensions.get('screen');

const GRID_TOP = 60;
const GRID_BOTTOM = 300;
const GRID_HORIZONTAL = 10;

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
        styles.gridContainer,
        {
          top: GRID_TOP,
          left: gridHorizontalPadding,
          width: gridDimensions.width,
          height: gridDimensions.height,
        },
      ]}>
      <LoadingAnimation />
    </View>
  );
};

// Initial empty grid configuration
const initialGridData: GridConfig = {
  gridRows: 0,
  gridCols: 0,
  letterGrid: [],
  placedWords: [],
  normalizedPlacedWords: [],
  gridHorizontalPadding: 0,
};

type GridLettersProps = {
  blockSize: number;
  words: string[];
  goToMenu: () => void;
  category: CategorySelection;
  gridSize: GridSize;
};

export default function GridLetters({
  blockSize,
  words,
  goToMenu,
  gridSize,
  category,
}: GridLettersProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [gridData, setGridData] = useState<GridConfig>(initialGridData);
  const [error, setError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState<number>(0);

  // Calculate basic dimensions before any generation
  const preDimensions = useMemo(() => {
    const gridRows = Math.floor((height - GRID_BOTTOM) / blockSize);
    const gridCols = Math.floor((width - GRID_HORIZONTAL) / blockSize);
    const gridHorizontalPadding = (width - gridCols * blockSize) / 2;

    return {
      gridRows,
      gridCols,
      gridHorizontalPadding,
      width: gridCols * blockSize,
      height: gridRows * blockSize,
    };
  }, [blockSize]);

  // Reset game function
  const resetGame = useCallback(() => {
    setGameKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Schedule the heavy computation to run after the next frame
    const generateGridAsync = () => {
      // Use requestAnimationFrame to schedule work after rendering
      requestAnimationFrame(() => {
        try {
          const {gridRows, gridCols, gridHorizontalPadding} = preDimensions;

          // Move the heavy computation to a promise to avoid blocking
          const gridGenerationPromise = new Promise<{
            grid: string[][];
            placedWords: string[];
            normalizedPlacedWords: string[];
          }>(resolve => {
            try {
              const result = generateLetterGrid(gridCols, gridRows, words);
              resolve(result);
            } catch ($error) {
              console.error('Grid generation error:', $error);
              resolve({grid: [], placedWords: [], normalizedPlacedWords: []});
            }
          });

          gridGenerationPromise.then(
            ({grid, placedWords, normalizedPlacedWords}) => {
              if (!isMounted) {
                return;
              }

              if (grid.length === 0) {
                setError('Failed to generate grid. Please try again.');
              } else {
                setGridData({
                  gridRows,
                  gridCols,
                  letterGrid: grid,
                  placedWords,
                  normalizedPlacedWords,
                  gridHorizontalPadding,
                });
              }

              setIsLoading(false);
            },
          );
        } catch ($error) {
          if (!isMounted) {
            return;
          }
          console.error('Error in grid generation:', $error);
          setError('Unexpected error occurred. Please try again.');
          setIsLoading(false);
        }
      });
    };

    generateGridAsync();

    // Cleanup to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [blockSize, words, gameKey, preDimensions]);

  // Check if we have a valid grid with content
  const hasValidGrid = gridData.letterGrid.length > 0 && !isLoading && !error;

  // Calculate fallback dimensions for loading state
  const loadingDimensions = {
    width: preDimensions.width,
    height: preDimensions.height,
  };

  return (
    <LinearGradient style={styles.container} colors={['#994CFD', '#6F54FB']}>
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
        <Suspense
          fallback={
            <LoadingFallback
              gridDimensions={loadingDimensions}
              gridHorizontalPadding={preDimensions.gridHorizontalPadding}
            />
          }>
          {hasValidGrid && (
            <GridContent
              gridData={gridData}
              blockSize={blockSize}
              onGoHome={goToMenu}
              onGameReset={resetGame}
              gridSize={gridSize}
              category={category}
            />
          )}
        </Suspense>
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
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: '#C4A7EC',
    borderColor: '#C4A7EC',
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
