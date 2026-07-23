import React, {useEffect, useMemo, useState} from 'react';
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

const SPRING_IN = {mass: 0.5, damping: 12, stiffness: 90};
const SPRING_OUT = {mass: 0.3, damping: 15, stiffness: 90};

// Soft violet while forming, green once the word is valid.
const ACTIVE_COLOR = 'rgba(139,92,246,0.32)';
const VALID_COLOR = 'rgba(34,197,94,0.34)';

const buildPath = (selection: WordWavePosition[], cellSize: number) => {
  const path = Skia.Path.Make();

  if (selection.length === 0) {
    return path;
  }

  const start = selection[0];
  const end = selection[selection.length - 1];
  const half = cellSize / 2;

  path.moveTo(start.col * cellSize + half, start.row * cellSize + half);
  path.lineTo(end.col * cellSize + half, end.row * cellSize + half);

  return path;
};

const WordWaveSelectionLine: React.FC<WordWaveSelectionLineProps> = ({
  selection,
  cellSize,
  valid,
}) => {
  const hasSelection = selection.length > 0;
  const pathScale = useSharedValue(0);
  const pathOpacity = useSharedValue(0);

  // Keep the last non-empty selection so the line can fade out gracefully.
  const [renderSelection, setRenderSelection] = useState(selection);

  useEffect(() => {
    if (hasSelection) {
      setRenderSelection(selection);
    }
  }, [hasSelection, selection]);

  useEffect(() => {
    pathScale.value = withSpring(hasSelection ? 1 : 0, {
      ...(hasSelection ? SPRING_IN : SPRING_OUT),
    });
    pathOpacity.value = withSpring(hasSelection ? 1 : 0, {
      ...(hasSelection ? SPRING_IN : SPRING_OUT),
    });
  }, [hasSelection, pathOpacity, pathScale]);

  const path = useMemo(
    () => buildPath(renderSelection, cellSize),
    [renderSelection, cellSize],
  );

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
