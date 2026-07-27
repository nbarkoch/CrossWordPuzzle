import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import GradientSurface, {
  GradientVariant,
  GRADIENT_VARIANTS,
} from './GradientSurface';

interface DialogButtonProps {
  onPress: () => void;
  text: string;
  type: GradientVariant;
  disabled?: boolean;
  fullWidth?: boolean;
}

function DialogButton({
  onPress,
  text,
  type,
  disabled = false,
  fullWidth = false,
}: DialogButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({pressed}) => [
        styles.pressable,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        {transform: [{scale: pressed && !disabled ? 0.95 : 1}]},
      ]}
      onPress={onPress}>
      <GradientSurface variant={type} contentStyle={styles.face}>
        <Text style={[styles.text, {color: GRADIENT_VARIANTS[type].textColor}]}>
          {text}
        </Text>
      </GradientSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  face: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DialogButton;
