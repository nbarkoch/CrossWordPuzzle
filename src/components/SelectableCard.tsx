import React from 'react';
import {StyleProp, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import GradientSurface, {
  GradientVariant,
} from '~/components/dialogs/GradientSurface';

const SELECT_SPRING = {mass: 0.5, damping: 12, stiffness: 90};

type SelectableCardProps = {
  isSelected: boolean;
  onPress: () => void;
  index?: number;
  radius?: number;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: (variant: GradientVariant) => React.ReactNode;
};

// A tappable card that springs up and swaps to the "primary" gradient when
// selected, falling back to the soft "third" gradient when idle. Shared by the
// category and puzzle-size grids so both selections feel identical.
const SelectableCard = ({
  isSelected,
  onPress,
  index,
  radius = 16,
  containerStyle,
  contentStyle,
  children,
}: SelectableCardProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: withSpring(isSelected ? 1.06 : 1, SELECT_SPRING)}],
  }));

  const variant: GradientVariant = isSelected ? 'primary' : 'third';

  return (
    <Animated.View
      entering={index !== undefined ? FadeInDown.delay(index * 60) : undefined}
      style={[containerStyle, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.shadow, isSelected ? styles.shadowSelected : styles.shadowIdle]}>
        <GradientSurface
          variant={variant}
          radius={radius}
          contentStyle={contentStyle}>
          {children(variant)}
        </GradientSurface>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 18,
    shadowOffset: {width: 0, height: 3},
  },
  shadowIdle: {
    shadowColor: '#7445E1',
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowSelected: {
    shadowColor: '#C026D3',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default SelectableCard;
