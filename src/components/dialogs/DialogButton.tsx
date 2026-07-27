import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type DialogButtonType = 'primary' | 'secondary';

interface DialogButtonProps {
  onPress: () => void;
  text: string;
  type: DialogButtonType;
}

const VARIANTS: Record<
  DialogButtonType,
  {outer: string[]; middle: string[]; inner: string[]; textColor: string}
> = {
  primary: {
    outer: ['#EE21E3', '#AC07A9'],
    middle: ['#FF70FF', '#EF2FE4'],
    inner: ['#FD48F5', '#E92FDC', '#E129D5'],
    textColor: 'white',
  },
  secondary: {
    outer: ['#A273F9', '#9559F7'],
    middle: ['#FFFFFE', '#E2D0F9'],
    inner: ['#FBFAFF', '#F2E7FD', '#EFE1FD'],
    textColor: '#6E45D0',
  },
};

function DialogButton({onPress, text, type}: DialogButtonProps) {
  const variant = VARIANTS[type];
  return (
    <Pressable
      style={({pressed}) => [
        styles.pressable,
        {transform: [{scale: pressed ? 0.95 : 1}]},
      ]}
      onPress={onPress}>
      <LinearGradient colors={variant.outer} style={styles.border}>
        <View style={styles.borderContainer}>
          <LinearGradient colors={variant.middle} style={styles.border}>
            <View style={styles.borderContainer}>
              <LinearGradient colors={variant.inner} style={styles.face}>
                <Text style={[styles.text, {color: variant.textColor}]}>
                  {text}
                </Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  border: {
    padding: 2,
  },
  borderContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  face: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DialogButton;
