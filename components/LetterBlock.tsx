import Animated, {SharedValue, useAnimatedStyle} from 'react-native-reanimated';
import {Position} from '../utils/types';
import {StyleSheet, View} from 'react-native';
import React from 'react';

const LetterBlock: React.FC<{
  letter: string;
  row: number;
  col: number;
  selectedBlocks: SharedValue<Position[]>;
  gridCols: number;
  blockSize: number;
}> = ({letter, row, col, selectedBlocks, gridCols, blockSize}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    color: selectedBlocks.value.some(
      block => block.row === row && block.col === gridCols - 1 - col,
    )
      ? '#FFFFFF'
      : '#333333',
  }));

  const letterContainerStyle = {
    left: col * blockSize,
    top: row * blockSize,
    width: blockSize,
    height: blockSize,
  };
  return (
    <View style={[styles.letterContainer, letterContainerStyle]}>
      <Animated.Text style={[styles.letter, animatedStyle]}>
        {letter}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  letterContainer: {
    position: 'absolute',

    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  letter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LetterBlock;
