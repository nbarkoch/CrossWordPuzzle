import React from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Group, Path, Skia} from '@shopify/react-native-skia';
import {WordSequence} from '~/utils/types';
import {SEQUENCE_COLORS} from '~/utils/consts';

type WordsLinesProps = {
  sequences: WordSequence[];
  blockSize: number;
};

const WordsLines = React.memo(({sequences, blockSize}: WordsLinesProps) => {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
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
    </Canvas>
  );
});

export default WordsLines;
