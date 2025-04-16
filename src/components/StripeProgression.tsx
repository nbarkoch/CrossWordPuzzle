import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  SharedValue,
  interpolate,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

const FILLED_COLOR: [string, string] = ['#e77cff', '#d93cfc'];

interface StripeProgressProps {
  width: number;
  height: number;
  progress: SharedValue<number>;
  wordsFound?: number;
  totalWords?: number;
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
  colors: [string, string],
) => {
  const stripes: JSX.Element[] = [];

  for (let i = -stripeWidth; i < width + compression; i += stripeWidth) {
    const path = Skia.Path.Make();
    path.moveTo(i, height);
    path.lineTo(i + stripeWidth, height);
    path.lineTo(i + stripeWidth * compression, 0);
    path.lineTo(i + stripeWidth * compression - stripeWidth, 0);
    path.close();

    stripes.push(
      <Path key={i} path={path} color={i % 2 === 0 ? colors[0] : colors[1]} />,
    );
  }
  return stripes;
};

const StripeProgress: React.FC<StripeProgressProps> = ({
  width,
  height,
  progress,
  wordsFound = 0,
  totalWords = 0,
  stripeWidth = 10,
  stripeSpeed = 2000,
  compression = 2,
}) => {
  const formatProgress = (value: number) => {
    'worklet';
    return `${Math.round(value)}%`;
  };

  const offsetX = useSharedValue(0);
  const [displayText, setDisplayText] = useState(
    formatProgress(progress.value),
  );

  const filledStripes = React.useMemo(() => {
    return createStripeElements(
      width,
      height,
      stripeWidth,
      compression,
      FILLED_COLOR,
    );
  }, [width, height, stripeWidth, compression]);

  useAnimatedReaction(
    () => progress.value,
    currentValue => {
      runOnJS(setDisplayText)(formatProgress(currentValue));
    },
    [progress],
  );

  useEffect(() => {
    startAnimation(offsetX, stripeWidth, stripeSpeed);
    return () => cancelAnimation(offsetX);
  }, [offsetX, stripeSpeed, stripeWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{translateX: offsetX.value}, {scaleX: 2}],
    };
  });

  const maskStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: interpolate(progress.value, [0, 100], [0, width]),
    };
  });

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.container, {width, height, borderRadius: height / 2}]}>
        {/* Filled stripes as base layer */}
        <View style={styles.stripesContainer}>
          <Animated.View style={animatedStyle}>
            <Canvas style={{width, height}}>{filledStripes}</Canvas>
          </Animated.View>
        </View>

        {/* Empty stripes as mask layer */}
        <Animated.View style={[styles.progressMask, maskStyle]} />

        <View style={styles.textContainer}>
          <Animated.Text style={styles.text}>{displayText}</Animated.Text>
        </View>
        <View style={styles.wordCountContainer}>
          <Text style={styles.wordCountText}>
            {wordsFound}/{totalWords} WORDS
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  wordCountContainer: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#9845d740',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  wordCountText: {
    color: '#FFFFFFf0',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  stripesContainer: {
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  progressMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#9845d7c0',
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
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
});

export default StripeProgress;
