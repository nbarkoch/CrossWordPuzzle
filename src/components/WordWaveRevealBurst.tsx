import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {runOnJS} from 'react-native-worklets';

const REVEAL_DURATION_MS = 700;
const REVEAL_COLOR = 'rgb(196, 167, 230)';

export type RevealBurstItem = {
  key: string;
  row: number;
  col: number;
  delay: number;
};

type WordWaveRevealBurstProps = {
  item: RevealBurstItem;
  cellSize: number;
  onDone: (key: string) => void;
};

// A reveal burst lives on its own overlay layer, independent of the tile it came
// from. That lets the board refill immediately while each letter's burst plays
// out on top, staggered by its position in the word.
const WordWaveRevealBurst: React.FC<WordWaveRevealBurstProps> = ({
  item,
  cellSize,
  onDone,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      item.delay,
      withTiming(
        1,
        {duration: REVEAL_DURATION_MS, easing: Easing.out(Easing.cubic)},
        finished => {
          if (finished) {
            runOnJS(onDone)(item.key);
          }
        },
      ),
    );
  }, [item.delay, item.key, onDone, progress]);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.5, 1], [0, 1, 1, 0]),
    transform: [
      {scale: interpolate(progress.value, [0, 0.5, 1], [0.25, 1.1, 1.35])},
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.revealBurst,
        {
          width: cellSize - 3,
          height: cellSize - 3,
          left: item.col * cellSize + 1.5,
          top: item.row * cellSize + 1.5,
        },
        burstStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  revealBurst: {
    position: 'absolute',
    borderWidth: 6,
    borderRadius: 50,
    borderColor: REVEAL_COLOR,
  },
});

export default WordWaveRevealBurst;
