import React from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
  SharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {StyleSheet, Dimensions, View, Text} from 'react-native';
import {Canvas, Path, Skia, vec} from '@shopify/react-native-skia';

const {width, height} = Dimensions.get('screen');

const BLOCK_SIZE = 50;
const GRID_ROWS = Math.floor((height - 300) / BLOCK_SIZE);
const GRID_COLS = Math.floor((width - 10) / BLOCK_SIZE);
const GRID_TOP = 60;

// Sample grid of letters - you can replace this with your own word puzzle
const generateLetterGrid = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid: string[][] = [];
  for (let i = 0; i < GRID_ROWS; i++) {
    const row: string[] = [];
    for (let j = 0; j < GRID_COLS; j++) {
      row.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    grid.push(row);
  }
  return grid;
};

// Calculate angle between two positions in degrees (0-360)
const calculateAngle = (start: Position, end: Position): number => {
  'worklet';
  const dx = end.col - start.col;
  const dy = start.row - end.row;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (angle + 360) % 360;
};

// Also update isDirectionValid to use the same boundary logic
const isDirectionValid = (
  start: Position,
  direction: Direction,
  currentLength: number,
): boolean => {
  'worklet';
  const maxStepsX =
    direction.dx > 0
      ? GRID_COLS - 1 - start.col
      : direction.dx < 0
      ? start.col
      : Infinity;

  const maxStepsY =
    direction.dy > 0
      ? GRID_ROWS - 1 - start.row
      : direction.dy < 0
      ? start.row
      : Infinity;

  const maxSteps = Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));

  return currentLength <= maxSteps;
};

const getValidDirection = (start: Position, end: Position): Direction => {
  'worklet';
  const angle = calculateAngle(start, end);

  if (angle >= 337.5 || angle < 22.5) {
    return {dx: 1, dy: 0};
  }
  if (angle >= 22.5 && angle < 67.5) {
    return {dx: 1, dy: -1};
  }
  if (angle >= 67.5 && angle < 112.5) {
    return {dx: 0, dy: -1};
  }
  if (angle >= 112.5 && angle < 157.5) {
    return {dx: -1, dy: -1};
  }
  if (angle >= 157.5 && angle < 202.5) {
    return {dx: -1, dy: 0};
  }
  if (angle >= 202.5 && angle < 247.5) {
    return {dx: -1, dy: 1};
  }
  if (angle >= 247.5 && angle < 292.5) {
    return {dx: 0, dy: 1};
  }
  return {dx: 1, dy: 1};
};

interface Position {
  row: number;
  col: number;
}

interface BlockProps {
  row: number;
  col: number;
  letter: string;
  isSelected?: boolean;
}

const VALID_DIRECTIONS = [
  {dx: 0, dy: -1},
  {dx: 1, dy: -1},
  {dx: 1, dy: 0},
  {dx: 1, dy: 1},
  {dx: 0, dy: 1},
  {dx: -1, dy: 1},
  {dx: -1, dy: 0},
  {dx: -1, dy: -1},
];

const INITIAL_DIRECTION = VALID_DIRECTIONS[0];
type Direction = (typeof VALID_DIRECTIONS)[number];

const Block: React.FC<BlockProps> = ({row, col, letter, isSelected}) => {
  const blockStyle = {
    left: col * BLOCK_SIZE,
    top: row * BLOCK_SIZE,
    backgroundColor: isSelected ? '#a0a0ff' : '#ddd',
  };

  return (
    <View style={[styles.block, blockStyle]}>
      <Text style={styles.letter}>{letter}</Text>
    </View>
  );
};

const WordDisplay: React.FC<{word: SharedValue<string>}> = ({word}) => {
  const [displayWord, setDisplayWord] = React.useState('');

  useAnimatedReaction(
    () => word.value,
    currentValue => {
      runOnJS(setDisplayWord)(currentValue);
    },
  );

  return (
    <View style={styles.wordDisplay}>
      <Text style={styles.wordText}>{displayWord}</Text>
    </View>
  );
};
// Rest of your existing helper functions (calculateAngle, getValidDirection, etc.) remain the same

export default function GridLetters() {
  // Create a grid of letters
  const [letterGrid] = React.useState(() => generateLetterGrid());

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
    const x =
      startBlock.value.col * BLOCK_SIZE + BLOCK_SIZE / 2 + BLOCK_SIZE / 5;
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
      BLOCK_SIZE / 5 +
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

  // Modify your existing updateSelectedBlocks function to also update the word
  const updateSelectedBlocks = (
    start: Position,
    end: Position,
    direction: Direction,
  ) => {
    'worklet';
    // Your existing updateSelectedBlocks logic...
    const maxStepsX =
      direction.dx > 0
        ? GRID_COLS - 1 - start.col
        : direction.dx < 0
        ? start.col
        : Infinity;

    const maxStepsY =
      direction.dy > 0
        ? GRID_ROWS - 1 - start.row
        : direction.dy < 0
        ? start.row
        : Infinity;

    const maxSteps = Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));
    const requestedSteps = Math.max(
      Math.abs(end.col - start.col),
      Math.abs(end.row - start.row),
    );
    const steps = Math.min(requestedSteps, maxSteps);

    animateLengthChange(steps);

    const blocks: Position[] = [];
    let currentRow = start.row;
    let currentCol = start.col;

    for (let i = 0; i <= steps; i++) {
      blocks.push({row: currentRow, col: currentCol});
      currentRow += direction.dy;
      currentCol += direction.dx;
    }

    selectedBlocks.value = blocks;
    updateCurrentWord(blocks);
  };

  // Modify your gesture handlers to reset the word when needed
  const gesture = Gesture.Pan()
    .minDistance(1)
    .onStart(event => {
      'worklet';
      const col = Math.floor(event.absoluteX / BLOCK_SIZE);
      const row = Math.floor((event.absoluteY - GRID_TOP) / BLOCK_SIZE);

      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
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
      if (!isDrawing.value) return;

      const col = Math.floor(event.absoluteX / BLOCK_SIZE);
      const row = Math.floor((event.absoluteY - GRID_TOP) / BLOCK_SIZE);

      if (
        row >= 0 &&
        row < GRID_ROWS &&
        col >= 0 &&
        col < GRID_COLS &&
        (row !== currentBlock.value.row || col !== currentBlock.value.col)
      ) {
        currentBlock.value = {row, col: col};
        const newDirection = getValidDirection(startBlock.value, {row, col});
        const currentLength = Math.max(
          Math.abs(currentBlock.value.col - startBlock.value.col),
          Math.abs(currentBlock.value.row - startBlock.value.row),
        );

        if (isDirectionValid(startBlock.value, newDirection, currentLength)) {
          currentDirection.value = newDirection;
          animateDirectionChange(newDirection);
          updateSelectedBlocks(startBlock.value, {row, col}, newDirection);
        } else {
          updateSelectedBlocks(
            startBlock.value,
            {row, col},
            currentDirection.value,
          );
        }
      }
    })
    .onEnd(() => {
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
    });

  // Your existing animation functions remain the same...

  return (
    <View style={styles.container}>
      <WordDisplay word={currentWord} />
      <GestureDetector gesture={gesture}>
        <View style={[StyleSheet.absoluteFill, {top: GRID_TOP}]}>
          <Canvas style={[StyleSheet.absoluteFill, {zIndex: 1}]}>
            <Path
              path={useDerivedValue(() => {
                const path = Skia.Path.Make();

                if (!isDrawing.value) {
                  return path;
                }

                // Draw main highlight
                path.moveTo(start.value.x, start.value.y);
                path.lineTo(end.value.x, end.value.y);

                return path;
              })}
              style="stroke"
              strokeWidth={BLOCK_SIZE}
              strokeCap="round"
              color="rgba(160, 160, 255, 0.3)"
            />
            <Path
              path={useDerivedValue(() => {
                const path = Skia.Path.Make();

                if (!isDrawing.value) return path;

                // Draw inner line
                path.moveTo(start.value.x, start.value.y);
                path.lineTo(end.value.x, end.value.y);

                return path;
              })}
              style="stroke"
              strokeWidth={35}
              strokeCap="round"
              color="rgba(120, 120, 255, 0.4)"
            />
          </Canvas>
          {letterGrid.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <Block
                key={`${rowIndex}-${colIndex}`}
                row={rowIndex}
                col={colIndex}
                letter={letter}
                isSelected={selectedBlocks.value.some(
                  block => block.row === rowIndex && block.col === colIndex,
                )}
              />
            )),
          )}
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
  block: {
    position: 'absolute',
    width: BLOCK_SIZE,
    height: BLOCK_SIZE,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    zIndex: 2,
  },
  wordDisplay: {
    position: 'absolute',
    top: 10,
    margin: 10,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#333',
  },
});
