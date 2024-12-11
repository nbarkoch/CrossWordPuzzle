import React, {useMemo, useState} from 'react';
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
  generateLetterGrid,
  getValidDirection,
  isDirectionValid,
  updateSelectedBlocks,
} from '../utils/blockCalcs';
import WordsLines from './WordsLines';
import {SEQUENCE_COLORS, VALID_DIRECTIONS} from '../utils/consts';

const {width, height} = Dimensions.get('screen');

const BLOCK_SIZE = 50;
const GRID_TOP = 60;
const INITIAL_DIRECTION = VALID_DIRECTIONS[0];

type GridLettersProps = {blockSize: number};
export default function GridLetters({
  blockSize = BLOCK_SIZE,
}: GridLettersProps) {
  // Add state for found sequences

  const [sequences, setSequences] = useState<WordSequence[]>([]);

  // Add state to track found letters
  const foundLetters = useSharedValue<{[key: string]: boolean}>({});
  const currentColorIndex = useSharedValue(0);

  const getCurrentColor = () => {
    'worklet';
    return SEQUENCE_COLORS[currentColorIndex.value % SEQUENCE_COLORS.length];
  };

  const {gridRows, gridCols, letterGrid} = useMemo(() => {
    const $gridRows = Math.floor((height - 200) / blockSize);
    const $gridCols = Math.floor((width - 10) / blockSize);
    const $letterGrid = generateLetterGrid($gridCols, $gridRows);
    return {
      gridRows: $gridRows,
      gridCols: $gridCols,
      letterGrid: $letterGrid,
    };
  }, [blockSize]);

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

  const start = useDerivedValue(() => {
    const x = startBlock.value.col * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = startBlock.value.row * BLOCK_SIZE + BLOCK_SIZE / 2;
    return vec(x, y);
  });

  const end = useDerivedValue(() => {
    if (!isDrawing.value) {
      return vec(endPointX.value, endPointY.value);
    }

    const x =
      startBlock.value.col * BLOCK_SIZE +
      BLOCK_SIZE / 2 +
      animatedDx.value * animatedLength.value * BLOCK_SIZE;
    const y =
      startBlock.value.row * BLOCK_SIZE +
      BLOCK_SIZE / 2 +
      animatedDy.value * animatedLength.value * BLOCK_SIZE;

    return vec(x, y);
  });

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

  const isValidWord = (_: string): boolean => {
    'worklet';
    // For now, always return true as requested
    // Replace this with actual word validation later
    return true;
  };

  // Modified gesture handlers
  const gesture = Gesture.Pan()
    .minDistance(1)
    .onStart(event => {
      'worklet';
      const col = Math.floor(event.absoluteX / BLOCK_SIZE);
      const row = Math.floor((event.absoluteY - GRID_TOP) / BLOCK_SIZE);

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

      const col = Math.floor(event.absoluteX / BLOCK_SIZE);
      const row = Math.floor((event.absoluteY - GRID_TOP) / BLOCK_SIZE);

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
      if (currentWord.value && isValidWord(currentWord.value)) {
        // Add the sequence to found sequences
        const newSequence: WordSequence = {
          blocks: [...selectedBlocks.value],
          word: currentWord.value,
          start: selectedBlocks.value[0],
          end: selectedBlocks.value[selectedBlocks.value.length - 1],
          direction: currentDirection.value,
        };

        const updatedSequences = [...sequences, newSequence];
        runOnJS(setSequences)(updatedSequences);

        currentColorIndex.value =
          (currentColorIndex.value + 1) % SEQUENCE_COLORS.length;

        // Add found letters to the set
        const newFoundLetters = {...foundLetters.value};
        selectedBlocks.value.forEach(block => {
          const key = `${block.row}-${block.col}`;
          newFoundLetters[key] = true;
        });
        foundLetters.value = newFoundLetters;
      }

      // Reset current selection
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
    });

  return (
    <View style={styles.container}>
      <WordDisplay word={currentWord} />
      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.gridContainer,
            {right: (width - gridCols * blockSize) / 2},
          ]}>
          <View style={styles.blocksContainer}>
            {letterGrid.map((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const blockStyle = {
                  right: colIndex * BLOCK_SIZE,
                  top: rowIndex * BLOCK_SIZE,
                  backgroundColor: '#ddd',
                };
                return (
                  <View
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
                path={useDerivedValue(() => {
                  const path = Skia.Path.Make();
                  if (isDrawing.value) {
                    path.moveTo(start.value.x, start.value.y);
                    path.lineTo(end.value.x, end.value.y);
                  }
                  return path;
                })}
                style="stroke"
                strokeWidth={blockSize}
                strokeCap="round"
                color={useDerivedValue(() => getCurrentColor().active)}
              />
              <Path
                path={useDerivedValue(() => {
                  const path = Skia.Path.Make();
                  if (isDrawing.value) {
                    path.moveTo(start.value.x, start.value.y);
                    path.lineTo(end.value.x, end.value.y);
                  }
                  return path;
                })}
                style="stroke"
                strokeWidth={blockSize - 5}
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
                  foundLetters={foundLetters}
                  blockSize={BLOCK_SIZE}
                />
              )),
            )}
          </View>
        </View>
      </GestureDetector>
    </View>
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
    top: GRID_TOP,
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
    width: BLOCK_SIZE,
    height: BLOCK_SIZE,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
