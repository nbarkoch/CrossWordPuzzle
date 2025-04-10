import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Group, Path, Skia, SkPath} from '@shopify/react-native-skia';
import {WordSequence} from '~/utils/types';
import {SEQUENCE_COLORS} from '~/utils/consts';
import {
  SharedValue,
  useAnimatedReaction,
  runOnJS,
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

    useAnimatedReaction(
      () => (activeIndex.value === sequences.length ? activeIndex.value : -1),
      value => runOnJS(setColorIndex)(value % SEQUENCE_COLORS.length),
      [sequences.length],
    );

    // Memoize the saved sequences paths
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

    const activeColor =
      colorIndex < 0 ? 'transparent' : SEQUENCE_COLORS[colorIndex].active;

    return (
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Draw saved sequences */}
        {savedPaths.map(({path, color, index}) => (
          <Group key={`path-${index}`}>
            {colorIndex !== index && (
              <>
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
              </>
            )}
          </Group>
        ))}

        {/* Only render active selection path when needed */}
        <Path
          path={selectionPath}
          style="stroke"
          strokeWidth={blockSize}
          strokeCap="round"
          color={activeColor}
        />
        <Path
          path={selectionPath}
          style="stroke"
          strokeWidth={blockSize - 8}
          strokeCap="round"
          color={activeColor}
        />
      </Canvas>
    );
  },
);

export default UnifiedWordsLines;
