import React, {useEffect} from 'react';
import {View, StyleSheet, TextInput} from 'react-native';
import {
  Canvas,
  LinearGradient as SkiaLinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  SharedValue,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const FILL_GRADIENT_COLORS = ['#E383FC', '#D668FD', '#C54AFC'];
const LIGHT_STRIPE_GRADIENT_COLORS = ['#FF91FF52', '#EA55FF3D', '#B233EF34'];
const DARK_STRIPE_GRADIENT_COLORS = ['#ed51f542', '#b836e055', '#ac1ddb4a'];
const STRIPE_GRADIENT_COLORS: [string[], string[]] = [
  LIGHT_STRIPE_GRADIENT_COLORS,
  DARK_STRIPE_GRADIENT_COLORS,
];
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface StripeProgressProps {
  width: number;
  height: number;
  progress: SharedValue<number>;
  stripeWidth?: number;
  stripeSpeed?: number;
  compression?: number;
}

const startAnimation = (
  offsetX: SharedValue<number>,
  stripeWidth: number,
  stripeSpeed: number,
) => {
  'worklet';
  offsetX.value = withRepeat(
    withTiming(stripeWidth * 4, {
      duration: stripeSpeed,
      easing: Easing.linear,
    }),
    -1,
    false,
  );
};

const createStripeElements = (
  width: number,
  height: number,
  stripeWidth: number,
  compression: number,
  colors: [string[], string[]],
) => {
  const stripes: React.ReactElement[] = [];

  for (
    let i = -stripeWidth, stripeIndex = 0;
    i < width + compression;
    i += stripeWidth, stripeIndex += 1
  ) {
    const path = Skia.Path.Make();
    path.moveTo(i, height);
    path.lineTo(i + stripeWidth, height);
    path.lineTo(i + stripeWidth * compression, 0);
    path.lineTo(i + stripeWidth * compression - stripeWidth, 0);
    path.close();

    stripes.push(
      <Path key={i} path={path}>
        <SkiaLinearGradient
          start={vec(i, 0)}
          end={vec(i, height)}
          colors={colors[stripeIndex % 2]}
        />
      </Path>,
    );
  }
  return stripes;
};

const StripeProgress: React.FC<StripeProgressProps> = ({
  width,
  height,
  progress,
  stripeWidth = 10,
  stripeSpeed = 2000,
  compression = 2,
}) => {
  const offsetX = useSharedValue(0);
  const displayText = useDerivedValue(() => `${Math.round(progress.value)}%`);
  const stripeTravelDistance = stripeWidth * 4;
  const stripeCanvasWidth = width + stripeTravelDistance * 2;

  const filledStripes = React.useMemo(() => {
    return createStripeElements(
      stripeCanvasWidth,
      height,
      stripeWidth,
      compression,
      STRIPE_GRADIENT_COLORS,
    );
  }, [stripeCanvasWidth, height, stripeWidth, compression]);

  const animatedTextProps = useAnimatedProps(() => ({
    text: displayText.value,
    defaultValue: displayText.value,
  }));

  useEffect(() => {
    startAnimation(offsetX, stripeWidth, stripeSpeed);
    return () => cancelAnimation(offsetX);
  }, [offsetX, stripeSpeed, stripeWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {translateX: offsetX.value - stripeTravelDistance},
        {scaleX: 2},
      ],
    };
  });

  const progressFillStyle = useAnimatedStyle(() => {
    'worklet';
    const progressWidth = interpolate(progress.value, [0, 100], [0, width]);

    return {
      width: progressWidth,
      borderRadius: Math.min(height / 2, progressWidth / 2),
    };
  });

  return (
    <View
      style={[
        styles.wrapper,
        {width: width + 4.5, height: height + 4.5, borderRadius: height},
      ]}>
      <View style={[styles.container, {width, height, borderRadius: height}]}>
        <Animated.View style={[styles.progressFill, progressFillStyle]}>
          <Canvas style={{width, height}}>
            <Rect x={0} y={0} width={width} height={height}>
              <SkiaLinearGradient
                start={vec(0, 0)}
                end={vec(0, height)}
                colors={FILL_GRADIENT_COLORS}
              />
            </Rect>
          </Canvas>

          <Animated.View style={[styles.stripesLayer, animatedStyle]}>
            <Canvas style={{width: stripeCanvasWidth, height}}>
              {filledStripes}
            </Canvas>
          </Animated.View>
        </Animated.View>

        <View style={styles.textContainer}>
          <AnimatedTextInput
            animatedProps={animatedTextProps}
            editable={false}
            pointerEvents="none"
            style={[styles.text, styles.progressText]}
            underlineColorAndroid="transparent"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: '#cbabeec0',
    backgroundColor: '#a273d4d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#a374d6e1',
    backgroundColor: '#6640b2',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    height: '100%',
  },
  stripesLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  progressText: {
    width: '100%',
    padding: 0,
  },
});

export default StripeProgress;
