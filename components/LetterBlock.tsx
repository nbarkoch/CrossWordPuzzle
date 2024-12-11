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
  foundLetters: SharedValue<{[key: string]: boolean}>;
  blockSize: number;
};

export default function LetterBlock({
  letter,
  row,
  col,
  selectedBlocks,
  foundLetters,
  blockSize,
}: LetterBlockProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const key = `${row}-${col}`;
    const isSelected = selectedBlocks.value.some(
      block => block.row === row && block.col === col,
    );
    const isFound = foundLetters.value[key];

    return {
      transform: [
        {
          scale: withSpring(isSelected ? 1.1 : 1, {
            mass: 0.5,
            damping: 12,
            stiffness: 90,
          }),
        },
      ],
      backgroundColor: isFound ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
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
        <Text style={styles.text}>{letter}</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});
