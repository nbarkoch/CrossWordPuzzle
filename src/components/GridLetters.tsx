import React, {useEffect, useMemo, useState} from 'react';

import {StyleSheet, Dimensions, View} from 'react-native';

import {generateLetterGrid} from '../utils/generate';
import LinearGradient from 'react-native-linear-gradient';

import LoadingAnimation from './LoadingAnimation';
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

type GridLettersProps = {blockSize: number; words: string[]};
export default function GridLetters({blockSize, words}: GridLettersProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [gridData, setGridData] = useState<GridConfig>({
    gridRows: 0,
    gridCols: 0,
    letterGrid: [],
    placedWords: [],
    normalizedPlacedWords: [],
    gridHorizontalPadding: 0,
  });
  const [gameKey, setGameKey] = useState<number>(0);

  useEffect(() => {
    const generateGrid = async () => {
      setIsLoading(true);
      try {
        const $gridRows = Math.floor((height - GRID_BOTTOM) / blockSize);
        const $gridCols = Math.floor((width - GRID_HORIZONTAL) / blockSize);

        const {
          grid: $letterGrid,
          placedWords: $placedWords,
          normalizedPlacedWords: $normalizedPlacedWords,
        } = await new Promise<{
          grid: string[][];
          placedWords: string[];
          normalizedPlacedWords: string[];
        }>(resolve => {
          // Move the heavy computation off the main thread
          setTimeout(() => {
            try {
              const result = generateLetterGrid($gridCols, $gridRows, words);
              resolve(result);
            } catch (error) {
              console.error('Grid generation error:', error);
              resolve({grid: [], placedWords: [], normalizedPlacedWords: []});
            }
          }, 0);
        });

        const $gridHorizontalPadding = (width - $gridCols * blockSize) / 2;

        setGridData({
          gridRows: $gridRows,
          gridCols: $gridCols,
          letterGrid: $letterGrid,
          placedWords: $placedWords,
          normalizedPlacedWords: $normalizedPlacedWords,
          gridHorizontalPadding: $gridHorizontalPadding,
        });
      } catch (error) {
        console.error('Error in grid generation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateGrid();
  }, [blockSize, words, gameKey]);

  const {gridCols, gridRows} = gridData;

  const gridDimensions = useMemo(
    () => ({
      width: gridCols * blockSize,
      height: gridRows * blockSize,
    }),
    [gridCols, gridRows, blockSize],
  );

  if (isLoading) {
    return (
      <LinearGradient style={styles.container} colors={['#994CFD', '#6F54FB']}>
        <View
          style={[
            styles.gridContainer,
            {
              top: GRID_TOP,
              left: gridData.gridHorizontalPadding,
              width: gridDimensions.width,
              height: gridDimensions.height,
            },
          ]}>
          <LoadingAnimation />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient style={styles.container} colors={['#994CFD', '#6F54FB']}>
      <GridContent
        gridData={gridData}
        blockSize={blockSize}
        onGameReset={() => setGameKey(prev => prev + 1)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
