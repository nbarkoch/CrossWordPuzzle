import React, {useEffect, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Group, Path, Skia} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {WordWavePosition} from '~/utils/wordWave';

type WordWaveSelectionLineProps = {
  selection: WordWavePosition[];
  cellSize: number;
  valid: boolean;
};

// Matches the game's line spring (GridContent animateDirection/LengthChange).
const MOVE_SPRING = {mass: 0.5, damping: 12, stiffness: 90};
const IN_SPRING = {mass: 0.5, damping: 12, stiffness: 90};
const OUT_SPRING = {mass: 0.3, damping: 15, stiffness: 90};

// Soft violet while forming, green once the word is valid.
const ACTIVE_COLOR = 'rgba(139,92,246,0.32)';
const VALID_COLOR = 'rgba(34,197,94,0.34)';

const WordWaveSelectionLine: React.FC<WordWaveSelectionLineProps> = ({
  selection,
  cellSize,
  valid,
}) => {
  const hasSelection = selection.length > 0;

  // Anchor (start of the line) — jumps instantly to the touched cell.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Direction + length — spring toward their targets so the end swings/grows.
  const animatedDx = useSharedValue(0);
  const animatedDy = useSharedValue(0);
  const animatedLength = useSharedValue(0);

  const pathScale = useSharedValue(0);
  const pathOpacity = useSharedValue(0);

  // Distinguish a brand-new drag (snap into place) from a continuing one (spring).
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (!hasSelection) {
      wasActiveRef.current = false;
      pathScale.value = withSpring(0, OUT_SPRING);
      pathOpacity.value = withSpring(0, OUT_SPRING);
      return;
    }

    const start = selection[0];
    const end = selection[selection.length - 1];
    const half = cellSize / 2;

    const dCol = end.col - start.col;
    const dRow = end.row - start.row;
    const length = Math.max(Math.abs(dCol), Math.abs(dRow));
    const dx = length === 0 ? 0 : dCol / length;
    const dy = length === 0 ? 0 : dRow / length;

    // The anchor always jumps to the current start cell.
    startX.value = start.col * cellSize + half;
    startY.value = start.row * cellSize + half;

    if (!wasActiveRef.current) {
      // Fresh drag: snap direction/length so nothing carries over from before.
      wasActiveRef.current = true;
      animatedDx.value = dx;
      animatedDy.value = dy;
      animatedLength.value = length;
      pathScale.value = withSpring(1, IN_SPRING);
      pathOpacity.value = withSpring(1, IN_SPRING);
    } else {
      // Continuing drag: spring the end toward the new direction/length.
      animatedDx.value = withSpring(dx, MOVE_SPRING);
      animatedDy.value = withSpring(dy, MOVE_SPRING);
      animatedLength.value = withSpring(length, MOVE_SPRING);
    }
  }, [
    hasSelection,
    selection,
    cellSize,
    startX,
    startY,
    animatedDx,
    animatedDy,
    animatedLength,
    pathScale,
    pathOpacity,
  ]);

  const path = useDerivedValue(() => {
    const skPath = Skia.Path.Make();
    const endX =
      startX.value + animatedDx.value * animatedLength.value * cellSize;
    const endY =
      startY.value + animatedDy.value * animatedLength.value * cellSize;
    skPath.moveTo(startX.value, startY.value);
    skPath.lineTo(endX, endY);
    return skPath;
  }, [cellSize]);

  const outerStrokeWidth = useDerivedValue(
    () => cellSize * 0.86 * pathScale.value,
  );
  const innerStrokeWidth = useDerivedValue(
    () => Math.max(cellSize * 0.86 - 8, 0) * pathScale.value,
  );

  const color = valid ? VALID_COLOR : ACTIVE_COLOR;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group opacity={pathOpacity}>
        <Path
          path={path}
          style="stroke"
          strokeWidth={outerStrokeWidth}
          strokeCap="round"
          color={color}
        />
        <Path
          path={path}
          style="stroke"
          strokeWidth={innerStrokeWidth}
          strokeCap="round"
          color={color}
        />
      </Group>
    </Canvas>
  );
};

export default WordWaveSelectionLine;
