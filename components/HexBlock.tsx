import React from 'react';
import {View, Text} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {Position} from '../utils/types';

type HexBlockProps = {
  letter: string;
  row: number;
  col: number;
  selectedBlocks: SharedValue<Position[]>;
  blockSize: number;
  isFound?: boolean;
};

const HexBlock = ({
  letter,
  row,
  col,
  selectedBlocks,
  blockSize,
  isFound = false,
}: HexBlockProps) => {
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

  // Calculate hexagon points
  const hexHeight = blockSize;
  const hexWidth = blockSize * 0.866; // cos(30°) ≈ 0.866
  const offset = col % 2 === 0 ? hexHeight / 2 : 0;

  return (
    <View
      style={{
        position: 'absolute',
        right: col * (hexWidth * 0.75),
        top: row * hexHeight + offset,
        width: hexWidth,
        height: hexHeight,
      }}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedStyle,
        ]}>
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: isFound ? '#E5E7EB' : '#FFFFFF',
            borderRadius: hexHeight / 6,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          <Text
            style={{
              fontSize: blockSize / 2,
              fontWeight: '700',
              color: isFound ? '#9CA3AF' : '#4B5563',
              textTransform: 'uppercase',
            }}>
            {letter}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

export default React.memo(HexBlock);
