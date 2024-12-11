import React from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {StyleSheet, Dimensions, View} from 'react-native';
import {Canvas, Path, Skia, vec} from '@shopify/react-native-skia';

const {width, height} = Dimensions.get('screen');

const BLOCK_SIZE = 50;
const GRID_ROWS = Math.floor((height - 300) / BLOCK_SIZE);
const GRID_COLS = Math.floor((width - 10) / BLOCK_SIZE);

interface Position {
  row: number;
  col: number;
}

interface BlockProps {
  row: number;
  col: number;
  isSelected?: boolean;
}

// Valid directions for word search - only 45-degree increments
const VALID_DIRECTIONS = [
  {dx: 0, dy: -1}, // Up
  {dx: 1, dy: -1}, // Up-Right
  {dx: 1, dy: 0}, // Right
  {dx: 1, dy: 1}, // Down-Right
  {dx: 0, dy: 1}, // Down
  {dx: -1, dy: 1}, // Down-Left
  {dx: -1, dy: 0}, // Left
  {dx: -1, dy: -1}, // Up-Left
];
const INITIAL_DIRECTION = VALID_DIRECTIONS[0];
type Direction = (typeof VALID_DIRECTIONS)[number];

// Calculate angle between two positions in degrees (0-360)
const calculateAngle = (start: Position, end: Position): number => {
  'worklet';
  const dx = end.col - start.col;
  const dy = start.row - end.row;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (angle + 360) % 360;
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

const Block: React.FC<BlockProps> = ({row, col, isSelected}) => {
  const blockStyle = {
    left: col * BLOCK_SIZE,
    top: row * BLOCK_SIZE,
    backgroundColor: isSelected ? '#a0a0ff' : '#ddd',
  };
  return <View style={[styles.block, blockStyle]} />;
};

export default function App() {
  const endPointX = useSharedValue(0);
  const endPointY = useSharedValue(0);
  const isDrawing = useSharedValue(false);
  const startBlock = useSharedValue<Position>({row: -1, col: -1});
  const currentBlock = useSharedValue<Position>({row: -1, col: -1});
  const selectedBlocks = useSharedValue<Position[]>([]);
  const currentDirection = useSharedValue<Direction>({dx: 0, dy: 0}); // Added this

  // Animation-specific shared values
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

  const updateSelectedBlocks = (
    start: Position,
    end: Position,
    direction: Direction,
  ) => {
    'worklet';

    // Calculate maximum possible steps in current direction
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

    // For diagonal movement, we need the minimum of both axes
    const maxSteps = Math.min(Math.abs(maxStepsX), Math.abs(maxStepsY));

    // Calculate requested steps based on current pointer position
    const requestedSteps = Math.max(
      Math.abs(end.col - start.col),
      Math.abs(end.row - start.row),
    );

    // Use the smaller of maxSteps and requestedSteps
    const steps = Math.min(requestedSteps, maxSteps);

    // Animate the length change
    animateLengthChange(steps);

    // Build blocks array with bounded steps
    const blocks: Position[] = [];
    let currentRow = start.row;
    let currentCol = start.col;

    for (let i = 0; i <= steps; i++) {
      blocks.push({row: currentRow, col: currentCol});
      currentRow += direction.dy;
      currentCol += direction.dx;
    }

    selectedBlocks.value = blocks;
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

  const gesture = Gesture.Pan()
    .minDistance(1)
    .onStart(event => {
      'worklet';
      const col = Math.floor(event.absoluteX / BLOCK_SIZE);
      const row = Math.round(event.absoluteY / BLOCK_SIZE) - 1;

      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        startBlock.value = {row, col};
        currentBlock.value = {row, col};
        currentDirection.value = INITIAL_DIRECTION; // Use initial direction
        selectedBlocks.value = [{row, col}];
        isDrawing.value = true;

        // Initialize animation values
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
      const row = Math.round(event.absoluteY / BLOCK_SIZE) - 1;

      if (
        row >= 0 &&
        row < GRID_ROWS &&
        col >= 0 &&
        col < GRID_COLS &&
        (row !== currentBlock.value.row || col !== currentBlock.value.col)
      ) {
        currentBlock.value = {row, col};
        const newDirection = getValidDirection(startBlock.value, {row, col});

        // Calculate current selection length
        const currentLength = Math.max(
          Math.abs(currentBlock.value.col - startBlock.value.col),
          Math.abs(currentBlock.value.row - startBlock.value.row),
        );

        // Only change direction if it would be valid with current length
        if (isDirectionValid(startBlock.value, newDirection, currentLength)) {
          currentDirection.value = newDirection;
          animateDirectionChange(newDirection);
          updateSelectedBlocks(startBlock.value, {row, col}, newDirection);
        } else {
          // Keep current direction but update length if needed
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
      currentDirection.value = INITIAL_DIRECTION; // Use initial direction
      selectedBlocks.value = [];

      // Reset animations
      animatedLength.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      animatedDx.value = withTiming(0);
      animatedDy.value = withTiming(0);
    })
    .onFinalize(() => {
      'worklet';
      isDrawing.value = false;
      startBlock.value = {row: -1, col: -1};
      currentBlock.value = {row: -1, col: -1};
      currentDirection.value = INITIAL_DIRECTION; // Use initial direction
      selectedBlocks.value = [];

      // Reset animations
      animatedLength.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      animatedDx.value = withTiming(0);
      animatedDy.value = withTiming(0);
    });
  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
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
        {Array.from({length: GRID_ROWS}, (_, row) =>
          Array.from({length: GRID_COLS}, (_, col) => (
            <Block
              key={`${row}-${col}`}
              row={row}
              col={col}
              isSelected={selectedBlocks.value.some(
                block => block.row === row && block.col === col,
              )}
            />
          )),
        )}
      </View>
    </GestureDetector>
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
  },
});
