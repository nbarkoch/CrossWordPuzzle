import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
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
import {
  GRID_FRAME_PADDING,
  GRID_TOP,
  INITIAL_DIRECTION,
  SEQUENCE_COLORS,
} from '~/utils/consts';
import WordStatusDisplay from './WordsStatusDisplay';
import SuccessAnimation, {SuccessAnimationRef} from './SuccessAnimation';
import UnifiedWordsLines from './UnifiedWordsLines';
import EndGameDialog from './dialogs/GameEndDialog';
import GameHeader from './GameHeader';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {runOnJS} from 'react-native-worklets';
import {Banner} from './AdBanner';
import LinearGradient from 'react-native-linear-gradient';
import {getDateSeed} from '~/utils/generate';
import {clearSavedGame, saveGame} from '~/utils/gameStorage';

const buildFoundLetters = (sequences: WordSequence[]) => {
  const found: {[key: string]: boolean} = {};
  sequences.forEach(sequence => {
    sequence.blocks.forEach(block => {
      found[`${block.row}-${block.col}`] = true;
    });
  });
  return found;
};

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
  initialSequences?: WordSequence[];
};
export default function GridContent({
  gridData,
  blockSize,
  onGameReset,
  onGoHome,
  category,
  gridSize,
  mode,
  initialSequences = [],
}: GridContentProps) {
  const {
    gridRows,
    gridCols,
    letterGrid,
    placedWords,
    normalizedPlacedWords,
    gridHorizontalPadding,
  } = gridData;
  const [sequences, setSequences] = useState<WordSequence[]>(initialSequences);
  const [endDialog, setEndDialog] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const [foundLetters, setFoundLetters] = useState<{[key: string]: boolean}>(
    () => buildFoundLetters(initialSequences),
  );

  const resetEnabled = mode === 'classic';
  const gridDimensions = useMemo(
    () => ({
      width: gridCols * blockSize + 1,
      height: gridRows * blockSize + 1,
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

  const handleEndDialogHome = useCallback(() => {
    // Close the dialog first, then navigate on the next frame so the modal is
    // dismissed before the screen transition starts (otherwise it can be left
    // on screen).
    setEndDialog(false);
    requestAnimationFrame(onGoHome);
  }, [onGoHome]);

  // Restore progress bar when resuming a saved game.
  useEffect(() => {
    if (initialSequences.length > 0 && placedWords.length > 0) {
      progress.value = Math.floor(
        (initialSequences.length / placedWords.length) * 100,
      );
    }
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect completion and persist classic/daily game state on every change.
  useEffect(() => {
    if (mode !== 'classic' && mode !== 'daily') {
      return;
    }

    const normalizedFoundWords = sequences.map(seq => seq.word);
    const allWordsFound =
      normalizedPlacedWords.length > 0 &&
      normalizedPlacedWords.every(word =>
        normalizedFoundWords.includes(word),
      );

    if (allWordsFound) {
      setEndDialog(true);
    }

    // A finished classic game has nothing to resume — drop its save.
    if (mode === 'classic' && allWordsFound) {
      clearSavedGame('classic');
      return;
    }

    saveGame({
      mode,
      category,
      gridSize,
      gridData,
      sequences,
      completed: allWordsFound,
      dateSeed: mode === 'daily' ? getDateSeed() : undefined,
      savedAt: Date.now(),
    });
  }, [sequences, normalizedPlacedWords, mode, category, gridSize, gridData]);

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
            styles.gridShadowContainer,
            {
              top: GRID_TOP,
              left: gridHorizontalPadding,
              right: gridHorizontalPadding,
              width: gridDimensions.width,
              height: gridDimensions.height,
            },
          ]}>
          <View style={styles.gridFrame} />
          <View style={styles.gridContainer}>
            <View style={styles.blocksContainer}>
              {letterGrid.map((row, rowIndex) =>
                row.map((_, colIndex) => {
                  const blockStyle = {
                    left: colIndex * blockSize,
                    top: rowIndex * blockSize,
                    backgroundColor: '#F7F1F9',
                    borderTopWidth: 2,
                    borderBottomWidth: 1,
                    borderTopColor: '#FBF8FE',
                    borderBottomColor: '#EEE3F9',
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderLeftColor: '#FBF8FE',
                    borderRightColor: '#EEE3F9',
                    width: blockSize - 1,
                    height: blockSize - 1,
                    borderRadius: 1.5,
                  };
                  return (
                    <View
                      key={`${rowIndex}-${colIndex}`}
                      style={[styles.block, blockStyle]}>
                      <LinearGradient
                        style={{
                          width: blockSize - 2,
                          height: blockSize - 2,
                        }}
                        colors={['#F7EEFB', '#FBF6FD', '#F6EFFB']}
                      />
                    </View>
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
        </View>
      </GestureDetector>

      {/* Keep all other UI components as they were */}
      <View style={[styles.successAnimationContainer]}>
        <SuccessAnimation ref={successAnimationRef} blockSize={blockSize} />
      </View>
      <View
        style={[
          styles.bottomContainer,
          {top: GRID_TOP + gridDimensions.height + 14},
        ]}>
        <WordStatusDisplay
          normalizedPlacedWords={normalizedPlacedWords}
          foundSequences={sequences}
          progress={progress}
        />
      </View>
      <EndGameDialog
        visible={endDialog}
        onPlayAgain={resetGame}
        onGoHome={handleEndDialogHome}
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
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 10,
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#d4c4ea',
    borderColor: '#cdb8eb',
    shadowColor: '#74127f',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 3,
  },
  blocksContainer: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
  },
  canvasContainer: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  lettersContainer: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    zIndex: 3,
  },
  block: {
    position: 'absolute',
    overflow: 'hidden',
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
    left: 0,
    right: 0,
    bottom: Banner.height,
  },
});
