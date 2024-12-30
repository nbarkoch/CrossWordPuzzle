import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const LoadingAnimation = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const textOpacity = useSharedValue(0.7);

  React.useEffect(() => {
    // Continuous rotation animation
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 500,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    // Subtle scale pulsing
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    // Text opacity pulsing
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(0.7, {duration: 1000}),
      ),
      -1,
      true,
    );
  }, [rotation, scale, textOpacity]);

  const spinningStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}, {scale: scale.value}],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.springify().mass(0.5)}
      exiting={FadeOut.springify().mass(0.5)}
      style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.loadingBox}>
        <Animated.View style={[styles.spinnerContainer, spinningStyle]}>
          <LinearGradient
            colors={['#e77cff', 'white', 'white']}
            style={styles.spinner}
          />
          <View style={styles.spinnerCore} />
        </Animated.View>
        <Animated.Text style={[styles.loadingText, textStyle]}>
          Loading...
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingBox: {
    top: 10,
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  spinnerContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    opacity: 0.5,
  },
  spinnerCore: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 40,
  },
  innerSpinner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  loadingText: {
    color: '#553F7E',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
});

export default LoadingAnimation;
