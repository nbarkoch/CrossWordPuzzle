import React from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Group, Path, Skia, SkPath} from '@shopify/react-native-skia';
import {WordSequence} from '~/utils/types';
import {SEQUENCE_COLORS} from '~/utils/consts';
import {SharedValue} from 'react-native-reanimated';

type UnifiedWordsLinesProps = {
  sequences: WordSequence[];
  blockSize: number;
  selectionPath: SharedValue<SkPath>;
  activeColorIndex: number;
};

const UnifiedWordsLines = React.memo(
  ({
    sequences,
    blockSize,
    selectionPath,
    activeColorIndex,
  }: UnifiedWordsLinesProps) => {
    const activeColor =
      SEQUENCE_COLORS[activeColorIndex % SEQUENCE_COLORS.length].active;

    const showActiveLine = activeColorIndex !== sequences.length - 1;
    return (
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Draw saved sequences */}
        {sequences.map((seq, index) => {
          const colorIndex = index % SEQUENCE_COLORS.length;
          const color = SEQUENCE_COLORS[colorIndex].saved;

          const startX = seq.start.col * blockSize + blockSize / 2;
          const startY = seq.start.row * blockSize + blockSize / 2;
          const endX = seq.end.col * blockSize + blockSize / 2;
          const endY = seq.end.row * blockSize + blockSize / 2;

          const path = Skia.Path.Make();
          path.moveTo(startX, startY);
          path.lineTo(endX, endY);

          return (
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
          );
        })}

        {/* Draw active selection path */}
        {showActiveLine && (
          <>
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
          </>
        )}
      </Canvas>
    );
  },
);

export default UnifiedWordsLines;
