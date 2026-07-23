import React, {useLayoutEffect, useRef} from 'react';
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

// Snappy line springs — high stiffness / low mass so movement, spawn and
// removal all resolve quickly, with damping kept near-critical to avoid bounce.
const MOVE_SPRING = {mass: 0.3, damping: 15, stiffness: 220};
const IN_SPRING = {mass: 0.3, damping: 16, stiffness: 220};
const OUT_SPRING = {mass: 0.25, damping: 18, stiffness: 240};

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

  // Validity is frozen while the line is fading out, so a valid word that just
  // got released keeps its green color instead of flashing back to violet.
  const validState = useSharedValue(false);

  // Distinguish a brand-new drag (snap into place) from a continuing one (spring).
  const wasActiveRef = useRef(false);

  // Layout effect (runs before paint) so geometry is never a frame behind the
  // touch — a fresh drag can't briefly render at the previous word's location.
  useLayoutEffect(() => {
    if (!hasSelection) {
      wasActiveRef.current = false;
      // Leave validState untouched so the exit fade keeps the last color.
      pathScale.value = withSpring(0, OUT_SPRING);
      pathOpacity.value = withSpring(0, OUT_SPRING);
      return;
    }

    // Only update the color while there is an active selection.
    validState.value = valid;

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
    valid,
    cellSize,
    startX,
    startY,
    animatedDx,
    animatedDy,
    animatedLength,
    pathScale,
    pathOpacity,
    validState,
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

  // Drive color on the UI thread from the frozen validity so the fade-out never
  // changes color mid-animation.
  const color = useDerivedValue(() =>
    validState.value ? VALID_COLOR : ACTIVE_COLOR,
  );

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
