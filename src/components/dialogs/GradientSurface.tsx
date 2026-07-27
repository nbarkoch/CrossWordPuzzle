import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type GradientVariant = 'primary' | 'secondary' | 'third';

// The shared "raised, triple-bordered" look: an outer accent border, a bright
// inner rim, and the face gradient. Used by DialogButton and the option cards
// so every tappable surface in the app reads as the same material.
export const GRADIENT_VARIANTS: Record<
  GradientVariant,
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
  third: {
    outer: ['#D7BAF7', '#D8BBF7'],
    middle: ['#FFFFFE', '#E2D0F9'],
    inner: ['#FBFAFF', '#F2E7FD', '#EFE1FD'],
    textColor: '#6E45D0',
  },
};

type GradientSurfaceProps = {
  variant: GradientVariant;
  radius?: number;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

function GradientSurface({
  variant,
  radius = 20,
  contentStyle,
  children,
}: GradientSurfaceProps) {
  const colors = GRADIENT_VARIANTS[variant];
  return (
    <View style={[styles.clip, {borderRadius: radius + 2}]}>
      <LinearGradient colors={colors.outer} style={styles.border}>
        <View style={[styles.layer, {borderRadius: radius}]}>
          <LinearGradient colors={colors.middle} style={styles.border}>
            <View style={[styles.layer, {borderRadius: radius}]}>
              <LinearGradient
                colors={colors.inner}
                style={[styles.face, contentStyle]}>
                {children}
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  border: {
    padding: 2,
  },
  layer: {
    overflow: 'hidden',
  },
  face: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GradientSurface;
