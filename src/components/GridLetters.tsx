import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {StyleSheet, Dimensions, View} from 'react-native';
import {Canvas, Path, Skia, vec} from '@shopify/react-native-skia';
import {Direction, Position, WordSequence} from '../utils/types';
import LetterBlock from './LetterBlock';
import WordDisplay from './WordDisplay';
import {
  getValidDirection,
  isDirectionValid,
  isValidWord,
  updateSelectedBlocks,
} from '../utils/blockCalcs';
import WordsLines from './WordsLines';
import {SEQUENCE_COLORS, VALID_DIRECTIONS} from '../utils/consts';
import {generateLetterGrid} from '../utils/generate';
import WordStatusDisplay from './WordsStatusDisplay';
import LinearGradient from 'react-native-linear-gradient';
import SuccessAnimation, {SuccessAnimationRef} from './SuccessAnimation';

import StripeProgress from './StripeProgression';

const {width, height} = Dimensions.get('screen');

const GRID_TOP = 60;
const GRID_BOTTOM = 300;
const GRID_HORIZONTAL = 10;
const INITIAL_DIRECTION = VALID_DIRECTIONS[0];

type GridLettersProps = {blockSize: number; words: string[]};
export default function GridLetters({blockSize, words}: GridLettersProps) {
  // Add state for found sequences

  const [sequences, setSequences] = useState<WordSequence[]>([]);
  const [gridKey, setGridKey] = useState(0);
  // Add state to track found letters
  const [foundLetters, setFoundLetters] = useState<{[key: string]: boolean}>(
    {},
  );
  const currentColorIndex = useSharedValue(0);

  const getCurrentColor = useCallback(() => {
    'worklet';
    return SEQUENCE_COLORS[currentColorIndex.value % SEQUENCE_COLORS.length];
  }, [currentColorIndex.value]);

  // In your GridLetters component

  const {gridRows, gridCols, letterGrid, placedWords, gridHorizontalPadding} =
    useMemo(() => {
      const $gridRows = Math.floor((height - GRID_BOTTOM) / blockSize);
      const $gridCols = Math.floor((width - GRID_HORIZONTAL) / blockSize);
      try {
        const {grid: $letterGrid, placedWords: $placedWords} =
          generateLetterGrid($gridCols, $gridRows, words);
        const $gridHorizontalPadding = (width - $gridCols * blockSize) / 2;
        return {
          gridRows: $gridRows,
          gridCols: $gridCols,
          gridHorizontalPadding: $gridHorizontalPadding,
          letterGrid: $letterGrid,
          placedWords: $placedWords,
        };
      } catch (error) {
        return {
          gridRows: 0,
          gridCols: 0,
          gridHorizontalPadding: 0,
          letterGrid: [],
          placedWords: [],
        };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blockSize, words, gridKey]);

  const gridDimensions = useMemo(
    () => ({
      width: gridCols * blockSize,
      height: gridRows * blockSize,
    }),
    [gridCols, gridRows, blockSize],
  );

  // Keep track of the current word being formed
  const currentWord = useSharedValue('');

  // Your existing shared values
  const endPointX = useSharedValue(0);
  const endPointY = useSharedValue(0);
  const isDrawing = useSharedValue(false);
  const startBlock = useSharedValue<Position>({row: -1, col: -1});
  const currentBlock = useSharedValue<Position>({row: -1, col: -1});
  const selectedBlocks = useSharedValue<Position[]>([]);
  const currentDirection = useSharedValue<Direction>({dx: 0, dy: 0});
  const animatedDx = useSharedValue(0);
  const animatedDy = useSharedValue(0);
  const animatedLength = useSharedValue(0);
  const successAnimationRef = useRef<SuccessAnimationRef>(null);
  const progress = useSharedValue(0);

  const start = useDerivedValue(() => {
    const x = startBlock.value.col * blockSize + blockSize / 2;
    const y = startBlock.value.row * blockSize + blockSize / 2;
    return vec(x, y);
  });

  const end = useDerivedValue(() => {
    if (!isDrawing.value) {
      return vec(endPointX.value, endPointY.value);
    }

    const x =
      startBlock.value.col * blockSize +
      blockSize / 2 +
      animatedDx.value * animatedLength.value * blockSize;
    const y =
      startBlock.value.row * blockSize +
      blockSize / 2 +
      animatedDy.value * animatedLength.value * blockSize;

    return vec(x, y);
  });

  const resetGame = useCallback(() => {
    // Reset all state variables
    setSequences([]);
    setGridKey(prev => prev + 1);

    // Reset all shared values
    setFoundLetters({});
    currentColorIndex.value = 0;
    currentWord.value = '';
    endPointX.value = 0;
    endPointY.value = 0;
    isDrawing.value = false;
    startBlock.value = {row: -1, col: -1};
    currentBlock.value = {row: -1, col: -1};
    selectedBlocks.value = [];
    currentDirection.value = INITIAL_DIRECTION;
    progress.value = 0;

    // Reset animations with timing
    animatedLength.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    animatedDx.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    animatedDy.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [
    currentColorIndex,
    currentWord,
    endPointX,
    endPointY,
    isDrawing,
    startBlock,
    currentBlock,
    selectedBlocks,
    currentDirection,
    progress,
    animatedLength,
    animatedDx,
    animatedDy,
  ]);

  // Function to update the current word based on selected blocks
  const updateCurrentWord = (blocks: Position[]) => {
    'worklet';
    const word = blocks.map(block => letterGrid[block.row][block.col]).join('');
    currentWord.value = word;
  };

  const animateDirectionChange = (newDirection: Direction) => {
    'worklet';
    animatedDx.value = withSpring(newDirection.dx, {
      mass: 0.5,
      damping: 12,
      stiffness: 90,
    });
    animatedDy.value = withSpring(newDirection.dy, {
      mass: 0.5,
      damping: 12,
      stiffness: 90,
    });
  };
  const animateLengthChange = (newLength: number) => {
    'worklet';
    animatedLength.value = withSpring(newLength, {
      mass: 0.5,
      damping: 12,
      stiffness: 90,
    });
  };

  const resetSelection = useCallback(() => {
    'worklet';
    isDrawing.value = false;
    startBlock.value = {row: -1, col: -1};
    currentBlock.value = {row: -1, col: -1};
    currentDirection.value = INITIAL_DIRECTION;
    selectedBlocks.value = [];
    currentWord.value = '';

    animatedLength.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    animatedDx.value = withTiming(0);
    animatedDy.value = withTiming(0);
  }, [
    animatedDx,
    animatedDy,
    animatedLength,
    currentBlock,
    currentDirection,
    currentWord,
    isDrawing,
    selectedBlocks,
    startBlock,
  ]);

  useEffect(() => {
    // Find the matching sequence and its index
    const matchingSequenceIndex = sequences.findIndex(
      sequence => sequence.word === currentWord.value,
    );

    if (matchingSequenceIndex !== -1) {
      resetSelection();
    }
  }, [
    currentWord.value,
    gridHorizontalPadding,
    placedWords.length,
    progress,
    resetSelection,
    selectedBlocks.value,
    sequences,
  ]);

  const $isValidWord = useCallback(
    (word: string) => {
      'worklet';
      return isValidWord(word, placedWords, sequences);
    },
    [placedWords, sequences],
  );

  const setSuccess = useCallback(() => {
    const colorIndex = sequences.length % SEQUENCE_COLORS.length;

    successAnimationRef.current?.play(
      selectedBlocks.value,
      SEQUENCE_COLORS[colorIndex].active,
      gridHorizontalPadding,
      GRID_TOP,
    );

    progress.value = withTiming(
      Math.floor(((sequences.length + 1) / placedWords.length) * 100),
      {duration: 1000},
    );
  }, [
    gridHorizontalPadding,
    placedWords.length,
    progress,
    selectedBlocks.value,
    sequences.length,
  ]);

  // Modified gesture handlers
  const gesture = Gesture.Pan()
    .minDistance(1)
    .onStart(event => {
      'worklet';
      const col = Math.floor(
        (event.absoluteX - gridHorizontalPadding) / blockSize,
      );
      const row = Math.floor((event.absoluteY - GRID_TOP) / blockSize);

      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        startBlock.value = {row, col};
        currentBlock.value = {row, col};
        currentDirection.value = INITIAL_DIRECTION;
        selectedBlocks.value = [{row, col}];
        isDrawing.value = true;
        currentWord.value = letterGrid[row][col];

        animatedLength.value = 0;
        animatedDx.value = 0;
        animatedDy.value = 0;
      }
    })
    .onUpdate(event => {
      'worklet';
      if (!isDrawing.value) {
        return;
      }

      const col = Math.floor(
        (event.absoluteX - gridHorizontalPadding) / blockSize,
      );
      const row = Math.floor((event.absoluteY - GRID_TOP) / blockSize);

      if (
        row >= 0 &&
        row < gridRows &&
        col >= 0 &&
        col < gridCols &&
        (row !== currentBlock.value.row || col !== currentBlock.value.col)
      ) {
        currentBlock.value = {row, col};
        const newDirection = getValidDirection(startBlock.value, {row, col});
        const currentLength = Math.max(
          Math.abs(currentBlock.value.col - startBlock.value.col),
          Math.abs(currentBlock.value.row - startBlock.value.row),
        );

        if (
          isDirectionValid(
            startBlock.value,
            newDirection,
            currentLength,
            gridCols,
            gridRows,
          )
        ) {
          currentDirection.value = newDirection;
          animateDirectionChange(newDirection);

          const {blocks, steps} = updateSelectedBlocks(
            startBlock.value,
            {row, col},
            newDirection,
            gridCols,
            gridRows,
          );
          animateLengthChange(steps);
          selectedBlocks.value = blocks;
          updateCurrentWord(blocks);
        } else {
          const {blocks, steps} = updateSelectedBlocks(
            startBlock.value,
            {row, col},
            currentDirection.value,
            gridCols,
            gridRows,
          );

          animateLengthChange(steps);
          selectedBlocks.value = blocks;
          updateCurrentWord(blocks);
        }
      }
    })
    .onEnd(() => {
      'worklet';
      if (currentWord.value && $isValidWord(currentWord.value)) {
        // Add the sequence to found sequences
        const newSequence: WordSequence = {
          blocks: [...selectedBlocks.value],
          word: currentWord.value,
          start: selectedBlocks.value[0],
          end: selectedBlocks.value[selectedBlocks.value.length - 1],
          direction: currentDirection.value,
        };

        const updatedSequences = [...sequences, newSequence];

        runOnJS(setSuccess)();

        runOnJS(setSequences)(updatedSequences);

        currentColorIndex.value =
          (currentColorIndex.value + 1) % SEQUENCE_COLORS.length;

        // Add found letters to the set
        const newFoundLetters = {...foundLetters};
        selectedBlocks.value.forEach(block => {
          const key = `${block.row}-${block.col}`;
          newFoundLetters[key] = true;
        });
        runOnJS(setFoundLetters)(newFoundLetters);
      } else {
        // Reset current selection
        resetSelection();
      }
    });

  const selectionPath = useDerivedValue(() => {
    const path = Skia.Path.Make();

    if (isDrawing.value) {
      path.moveTo(start.value.x, start.value.y);
      path.lineTo(end.value.x, end.value.y);
    }
    return path;
  }, [sequences.length]);

  return (
    <LinearGradient style={styles.container} colors={['#994CFD', '#6F54FB']}>
      <WordDisplay word={currentWord} />
      <GestureDetector gesture={gesture}>
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
          <View style={styles.blocksContainer}>
            {letterGrid.map((row, rowIndex) =>
              row.map((_, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const blockStyle = {
                  right: colIndex * blockSize,
                  top: rowIndex * blockSize,
                  backgroundColor: foundLetters[key] ? '#ccc' : '#E5E7EB',
                  width: blockSize - 1,
                  height: blockSize - 1,
                };
                return (
                  <LinearGradient
                    colors={[
                      '#FFFFFF',
                      '#FDFFF8',
                      '#FDFFF8',
                      '#FDFFF8',
                      '#F8EEF7',
                    ]}
                    key={`${rowIndex}-${colIndex}`}
                    style={[styles.block, blockStyle]}
                  />
                );
              }),
            )}
          </View>
          {/* Permanent lines layer */}
          <View style={styles.canvasContainer}>
            <WordsLines sequences={sequences} blockSize={blockSize} />
          </View>

          {/* Active drawing layer */}
          <View style={styles.canvasContainer}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Path
                path={selectionPath}
                style="stroke"
                strokeWidth={blockSize}
                strokeCap="round"
                color={useDerivedValue(() => getCurrentColor().active)}
              />
              <Path
                path={selectionPath}
                style="stroke"
                strokeWidth={blockSize - 8}
                strokeCap="round"
                color={useDerivedValue(() => getCurrentColor().active)}
              />
            </Canvas>
          </View>
          {/* Letters layer on top */}
          <View style={styles.lettersContainer}>
            {letterGrid.map((row, rowIndex) =>
              row.map((letter, colIndex) => (
                <LetterBlock
                  key={`letter-${rowIndex}-${colIndex}`}
                  letter={letter}
                  row={rowIndex}
                  col={colIndex}
                  selectedBlocks={selectedBlocks}
                  blockSize={blockSize}
                />
              )),
            )}
          </View>
        </View>
      </GestureDetector>
      <View style={[styles.successAnimationContainer]}>
        <SuccessAnimation ref={successAnimationRef} blockSize={blockSize} />
      </View>
      <View style={styles.bottomContainer}>
        <View style={styles.progress}>
          <StripeProgress
            width={300}
            height={30}
            progress={progress}
            stripeWidth={5}
            compression={3}
            stripeSpeed={1500}
          />
        </View>
        <WordStatusDisplay
          placedWords={placedWords}
          foundSequences={sequences}
          onGameComplete={resetGame}
        />
      </View>
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
  blocksContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
  },
  canvasContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  lettersContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    zIndex: 3,
  },
  block: {
    position: 'absolute',
  },
  successAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
    pointerEvents: 'none',
  },
  progress: {
    position: 'absolute',
    bottom: 70,
    right: (width - 300) / 2,
  },
  bottomContainer: {position: 'absolute', bottom: 0, maxHeight: GRID_BOTTOM},
});
