import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Group, Path, Skia, SkPath} from '@shopify/react-native-skia';
import {WordSequence} from '~/utils/types';
import {SEQUENCE_COLORS} from '~/utils/consts';
import {
  SharedValue,
  useAnimatedReaction,
  runOnJS,
  useSharedValue,
  withSpring,
  useDerivedValue,
} from 'react-native-reanimated';

type UnifiedWordsLinesProps = {
  sequences: WordSequence[];
  blockSize: number;
  selectionPath: SharedValue<SkPath>;
  activeIndex: SharedValue<number>;
};

const UnifiedWordsLines = React.memo(
  ({
    sequences,
    blockSize,
    selectionPath,
    activeIndex,
  }: UnifiedWordsLinesProps) => {
    const [colorIndex, setColorIndex] = React.useState(0);

    // Add a spring animation value for the active path
    const pathOpacity = useSharedValue(0);
    const pathScale = useSharedValue(0);

    // Create a shared value to store the last non-empty path for exit animations
    const lastValidPath = useSharedValue<SkPath>(Skia.Path.Make());
    const isExiting = useSharedValue(false);
    const exitingColorIndex = useSharedValue(0);

    // Monitor selectionPath for changes
    useAnimatedReaction(
      () => {
        // Check if the path is empty or not
        return !selectionPath.value.isEmpty();
      },
      (hasPath, prevHasPath) => {
        if (hasPath !== prevHasPath) {
          if (hasPath) {
            // Path appeared - spring in
            isExiting.value = false;
            pathScale.value = withSpring(1, {
              mass: 0.5,
              damping: 12,
              stiffness: 90,
            });
            pathOpacity.value = withSpring(1, {
              mass: 0.3,
              damping: 15,
              stiffness: 90,
            });

            // Store a copy of the current path for potential exit animation
            lastValidPath.value = selectionPath.value.copy();
          } else {
            // Path disappeared - mark as exiting and store current color index
            isExiting.value = true;
            exitingColorIndex.value =
              activeIndex.value === sequences.length
                ? sequences.length % SEQUENCE_COLORS.length
                : colorIndex;

            // Spring out
            pathScale.value = withSpring(0, {
              mass: 0.3,
              damping: 15,
              stiffness: 90,
            });
            pathOpacity.value = withSpring(0, {
              mass: 0.3,
              damping: 15,
              stiffness: 90,
            });
          }
        } else if (hasPath) {
          // Update lastValidPath as long as we have a valid path
          lastValidPath.value = selectionPath.value.copy();
        }
      },
      [selectionPath, sequences.length, colorIndex],
    );

    useAnimatedReaction(
      () => (activeIndex.value === sequences.length ? activeIndex.value : -1),
      value => runOnJS(setColorIndex)(value),
      [sequences.length],
    );

    const savedPaths = useMemo(() => {
      return sequences.map((seq, index) => {
        const seqColorIndex = index % SEQUENCE_COLORS.length;
        const color = SEQUENCE_COLORS[seqColorIndex].active;

        const startX = seq.start.col * blockSize + blockSize / 2;
        const startY = seq.start.row * blockSize + blockSize / 2;
        const endX = seq.end.col * blockSize + blockSize / 2;
        const endY = seq.end.row * blockSize + blockSize / 2;

        const path = Skia.Path.Make();
        path.moveTo(startX, startY);
        path.lineTo(endX, endY);

        return {path, color, index};
      });
    }, [sequences, blockSize]);

    // Get current active color or exiting color
    const displayColor = useDerivedValue(() => {
      const currentColorIndex = isExiting.value
        ? exitingColorIndex.value
        : activeIndex.value === sequences.length
        ? sequences.length
        : colorIndex;
      return SEQUENCE_COLORS[
        (currentColorIndex > -1 ? currentColorIndex : 0) %
          SEQUENCE_COLORS.length
      ].active;
    }, [
      isExiting,
      exitingColorIndex,
      activeIndex,
      sequences.length,
      colorIndex,
    ]);

    // Choose which path to render - either current or last valid for exit animation
    const displayPath = useDerivedValue(() => {
      if (isExiting.value) {
        return lastValidPath.value;
      }
      return selectionPath.value;
    }, [isExiting, selectionPath, lastValidPath]);

    // Create animated transforms for the path
    const outerStrokeWidth = useDerivedValue(() => {
      return blockSize * pathScale.value;
    }, [blockSize, pathScale]);

    const innerStrokeWidth = useDerivedValue(() => {
      return (blockSize - 8) * pathScale.value;
    }, [blockSize, pathScale]);

    return (
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Draw saved sequences */}
        {savedPaths.map(({path, color, index}) => (
          <Group key={`path-${index}`}>
            <Path
              path={path}
              style="stroke"
              strokeWidth={blockSize}
              strokeCap="round"
              color={color}
            />
            <Path
              path={path}
              style="stroke"
              strokeWidth={blockSize - 8}
              strokeCap="round"
              color={color}
            />
          </Group>
        ))}

        {/* Animated selection path - using the display path and color */}
        <Group opacity={pathOpacity}>
          <Path
            path={displayPath}
            style="stroke"
            strokeWidth={outerStrokeWidth}
            strokeCap="round"
            color={displayColor}
          />
          <Path
            path={displayPath}
            style="stroke"
            strokeWidth={innerStrokeWidth}
            strokeCap="round"
            color={displayColor}
          />
        </Group>
      </Canvas>
    );
  },
);

export default UnifiedWordsLines;
