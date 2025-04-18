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
import {StyleSheet, View} from 'react-native';
import {Skia, vec} from '@shopify/react-native-skia';
import {
  CategorySelection,
  Direction,
  GameMode,
  GridSize,
  Position,
  WordSequence,
} from '~/utils/types';
import LetterBlock from './LetterBlock';
import {
  getValidDirection,
  isDirectionValid,
  isValidWord,
  updateSelectedBlocks,
} from '~/utils/blockCalcs';
import {GRID_TOP, INITIAL_DIRECTION, SEQUENCE_COLORS} from '~/utils/consts';
import WordStatusDisplay from './WordsStatusDisplay';
import LinearGradient from 'react-native-linear-gradient';
import SuccessAnimation, {SuccessAnimationRef} from './SuccessAnimation';
import UnifiedWordsLines from './UnifiedWordsLines';
import EndGameDialog from './dialogs/GameEndDialog';
import GameHeader from './GameHeader';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type GridConfig = {
  gridRows: number;
  gridCols: number;
  letterGrid: string[][];
  placedWords: string[];
  normalizedPlacedWords: string[];
  gridHorizontalPadding: number;
};

type GridContentProps = {
  gridData: GridConfig;
  blockSize: number;
  onGameReset: () => void;
  onGoHome: () => void;
  category: CategorySelection;
  mode: GameMode;
  gridSize: GridSize;
};
export default function GridContent({
  gridData,
  blockSize,
  onGameReset,
  onGoHome,
  category,
  gridSize,
  mode,
}: GridContentProps) {
  const {
    gridRows,
    gridCols,
    letterGrid,
    placedWords,
    normalizedPlacedWords,
    gridHorizontalPadding,
  } = gridData;
  const [sequences, setSequences] = useState<WordSequence[]>([]);
  const [endDialog, setEndDialog] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const [foundLetters, setFoundLetters] = useState<{[key: string]: boolean}>(
    {},
  );

  const resetEnabled = mode === 'classic';
  const gridDimensions = useMemo(
    () => ({
      width: gridCols * blockSize,
      height: gridRows * blockSize,
    }),
    [gridCols, gridRows, blockSize],
  );

  // Keep track of the current word being formed
  const currentWord = useSharedValue('');

  const endPointX = useSharedValue(0);
  const endPointY = useSharedValue(0);
  const isDrawing = useSharedValue(false);
  const selectedIndex = useSharedValue<number>(-1);
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
    // Reset all shared values
    setFoundLetters({});
    currentWord.value = '';
    endPointX.value = 0;
    endPointY.value = 0;
    isDrawing.value = false;
    selectedIndex.value = -1;
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

    onGameReset();
    setEndDialog(false);
  }, [
    currentWord,
    endPointX,
    endPointY,
    isDrawing,
    selectedIndex,
    startBlock,
    currentBlock,
    selectedBlocks,
    currentDirection,
    progress,
    animatedLength,
    animatedDx,
    animatedDy,
    onGameReset,
  ]);

  useEffect(() => {
    const normalizedFoundWords = sequences.map(seq => seq.word);

    const allWordsFound = normalizedPlacedWords.every(word =>
      normalizedFoundWords.includes(word),
    );

    if (allWordsFound && normalizedPlacedWords.length > 0) {
      setEndDialog(true);
    }
  }, [sequences, normalizedPlacedWords]);

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
    selectedIndex.value = -1;
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
    selectedIndex,
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
      return isValidWord(word, normalizedPlacedWords, sequences);
    },
    [normalizedPlacedWords, sequences],
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
      const row = Math.floor(
        (event.absoluteY - GRID_TOP - insets.top) / blockSize,
      );
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        startBlock.value = {row, col};
        currentBlock.value = {row, col};
        currentDirection.value = INITIAL_DIRECTION;
        selectedBlocks.value = [{row, col}];
        isDrawing.value = true;
        currentWord.value = letterGrid[row][col];
        selectedIndex.value = sequences.length;

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
      const row = Math.floor(
        (event.absoluteY - GRID_TOP - insets.top) / blockSize,
      );

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

        // Add found letters to the set
        const newFoundLetters = {...foundLetters};
        selectedBlocks.value.forEach(block => {
          const key = `${block.row}-${block.col}`;
          newFoundLetters[key] = true;
        });

        isDrawing.value = false;
        runOnJS(setFoundLetters)(newFoundLetters);
      } else {
        // Reset current selection
        resetSelection();
      }
    });
  const selectionPath = useDerivedValue(() => {
    const path = Skia.Path.Make();

    if (selectedIndex.value === sequences.length) {
      path.moveTo(start.value.x, start.value.y);
      path.lineTo(end.value.x, end.value.y);
    }
    return path;
  }, [sequences.length]);

  return (
    <>
      <GameHeader
        word={currentWord}
        mode={mode}
        category={category}
        size={gridSize}
        onGoHome={onGoHome}
      />
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

          {/* Replace both canvas layers with a single UnifiedWordsLines component */}
          <View style={styles.canvasContainer}>
            <UnifiedWordsLines
              sequences={sequences}
              blockSize={blockSize}
              selectionPath={selectionPath}
              activeIndex={selectedIndex}
            />
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

      {/* Keep all other UI components as they were */}
      <View style={[styles.successAnimationContainer]}>
        <SuccessAnimation ref={successAnimationRef} blockSize={blockSize} />
      </View>
      <View style={styles.bottomContainer}>
        <WordStatusDisplay
          normalizedPlacedWords={normalizedPlacedWords}
          foundSequences={sequences}
          progress={progress}
        />
      </View>
      <EndGameDialog
        visible={endDialog}
        onPlayAgain={resetGame}
        onGoHome={onGoHome}
        resetEnabled={resetEnabled}
      />
    </>
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

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
  },
});
