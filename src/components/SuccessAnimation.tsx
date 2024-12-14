import React, {forwardRef} from 'react';
import {Canvas, Path, Skia, Group} from '@shopify/react-native-skia';
import {StyleSheet} from 'react-native';
import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import {Position} from '../utils/types';

export type SuccessAnimationRef = {
  play: (
    blocks: Position[],
    color: string,
    offsetX: number,
    offsetY: number,
  ) => void;
};

type Props = {
  blockSize: number;
};

const SuccessAnimation = forwardRef<SuccessAnimationRef, Props>(
  ({blockSize}, ref) => {
    const positions = useSharedValue<Position[]>([]);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const activeColor = useSharedValue('');
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    React.useImperativeHandle(
      ref,
      () => {
        const play: SuccessAnimationRef['play'] = (blocks, color, x, y) => {
          positions.value = blocks;
          activeColor.value = color;
          offsetX.value = x;
          offsetY.value = y;

          scale.value = withSequence(
            withTiming(1, {duration: 0}),
            withSpring(1.5, {mass: 0.5, damping: 12, stiffness: 90}),
          );

          opacity.value = withSequence(
            withTiming(1, {duration: 100}),
            withTiming(0, {duration: 300}),
          );
        };
        return {play};
      },
      [positions, scale, opacity, activeColor, offsetX, offsetY],
    );

    const path = useDerivedValue(() => {
      const $path = Skia.Path.Make();

      if (positions.value.length < 2) {
        return $path;
      }

      // Convert first position to canvas coordinates with offset
      const startX =
        positions.value[0].col * blockSize + blockSize / 2 + offsetX.value;
      const startY =
        positions.value[0].row * blockSize + blockSize / 2 + offsetY.value;

      $path.moveTo(startX, startY);

      // Draw lines through all positions with offset
      for (let i = 1; i < positions.value.length; i++) {
        const x =
          positions.value[i].col * blockSize + blockSize / 2 + offsetX.value;
        const y =
          positions.value[i].row * blockSize + blockSize / 2 + offsetY.value;
        $path.lineTo(x, y);
      }

      return $path;
    });

    const matrix = useDerivedValue(() => {
      if (positions.value.length < 2) {
        return Skia.Matrix();
      }

      let centerX = 0;
      let centerY = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      // Calculate bounds and center
      positions.value.forEach(pos => {
        const x = pos.col * blockSize + blockSize / 2 + offsetX.value;
        const y = pos.row * blockSize + blockSize / 2 + offsetY.value;
        centerX += x;
        centerY += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });

      centerX /= positions.value.length;
      centerY /= positions.value.length;

      const width = Math.abs(maxX - minX) + blockSize;
      const height = Math.abs(maxY - minY) + blockSize;
      const aspectRatio = width / height;

      let scaleX = scale.value;
      let scaleY = scale.value;
      if (aspectRatio !== 1) {
        if (aspectRatio > 1) {
          scaleX = scale.value * 0.8;
        } else {
          scaleY = scale.value * 0.8;
        }
      }

      const $matrix = Skia.Matrix();
      $matrix.translate(centerX, centerY);
      $matrix.scale(scaleX, scaleY);
      $matrix.translate(-centerX, -centerY);

      return $matrix;
    });

    const outerColor = useDerivedValue(() => {
      if (!activeColor.value) {
        return `rgba(255, 255, 255, ${opacity.value * 0.5})`;
      }

      const rgba = activeColor.value.match(/[\d.]+/g);
      if (!rgba) {
        return `rgba(255, 255, 255, ${opacity.value * 0.5})`;
      }

      const r = Math.min(parseInt(rgba[0], 10), 255);
      const g = Math.min(parseInt(rgba[1], 10), 255);
      const b = Math.min(parseInt(rgba[2], 10), 255);

      return `rgba(${r + 50 > 255 ? 255 : r + 50}, ${
        g + 50 > 255 ? 255 : g + 50
      }, ${b + 50 > 255 ? 255 : b + 50}, ${opacity.value * 0.5})`;
    });

    return (
      <Canvas style={StyleSheet.absoluteFill}>
        <Group matrix={matrix}>
          <Path
            path={path}
            style="stroke"
            strokeWidth={blockSize}
            strokeCap="round"
            color={outerColor}
          />
        </Group>
      </Canvas>
    );
  },
);

export default SuccessAnimation;
