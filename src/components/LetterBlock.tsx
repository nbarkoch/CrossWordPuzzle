import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {Position} from '../utils/types';

type LetterBlockProps = {
  letter: string;
  row: number;
  col: number;
  selectedBlocks: SharedValue<Position[]>;
  blockSize: number;
};

export default function LetterBlock({
  letter,
  row,
  col,
  selectedBlocks,
  blockSize,
}: LetterBlockProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const isSelected = selectedBlocks.value.some(
      block => block.row === row && block.col === col,
    );

    return {
      transform: [
        {
          scale: withSpring(isSelected ? 1.15 : 1, {
            mass: 0.5,
            damping: 12,
            stiffness: 90,
          }),
        },
      ],
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          right: col * blockSize,
          top: row * blockSize,
          width: blockSize,
          height: blockSize,
        },
      ]}>
      <Animated.View style={[styles.letter, animatedStyle]}>
        <Text style={[styles.text, {fontSize: blockSize / 1.75}]}>
          {letter.toLocaleUpperCase()}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  text: {
    fontWeight: 'bold',
    color: '#553F7Ed0',
  },
});
