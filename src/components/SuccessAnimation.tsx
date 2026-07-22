import React, {forwardRef} from 'react';
import {
  Canvas,
  Path,
  Skia,
  Group,
  Mask,
  Rect,
} from '@shopify/react-native-skia';
import {Dimensions, StyleSheet} from 'react-native';
import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';
import {Position} from '~/utils/types';

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

const {width, height} = Dimensions.get('screen');

const SuccessAnimation = forwardRef<SuccessAnimationRef, Props>(
  ({blockSize}, ref) => {
    const positions = useSharedValue<Position[]>([]);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const activeColor = useSharedValue('');
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    React.useImperativeHandle(ref, () => {
      const play: SuccessAnimationRef['play'] = (blocks, color, x, y) => {
        positions.value = blocks;
        activeColor.value = color;
        offsetX.value = x;
        offsetY.value = y;

        scale.value = withSequence(
          withTiming(0, {duration: 0}),
          withSpring(1, {mass: 0.5, damping: 12, stiffness: 90}),
        );

        opacity.value = 1;
        opacity.value = withTiming(0, {duration: 1000});
      };
      return {play};
    }, [positions, scale, opacity, activeColor, offsetX, offsetY]);

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

    const outerStrokeWidth = useDerivedValue(() => {
      return blockSize * (1.15 + scale.value * 0.65);
    });

    const innerStrokeWidth = useDerivedValue(() => {
      return blockSize * (0.9 + scale.value * 0.9);
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
      }, ${b + 50 > 255 ? 255 : b + 50}, ${opacity.value * 0.7})`;
    });

    return (
      <Canvas style={StyleSheet.absoluteFill}>
        <Mask
          mode="luminance"
          mask={
            <Group>
              <Path
                path={path}
                style="stroke"
                strokeWidth={outerStrokeWidth}
                strokeCap="round"
                color="white"
              />
              <Path
                path={path}
                style="stroke"
                strokeWidth={innerStrokeWidth}
                strokeCap="round"
                color="black"
              />
            </Group>
          }>
          <Rect x={0} y={0} width={width} height={height} color={outerColor} />
        </Mask>
      </Canvas>
    );
  },
);

export default SuccessAnimation;
