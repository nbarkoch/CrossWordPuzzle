import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import loadingBlocksAnimation from '~/assets/loading.json';

const LoadingAnimation = () => {
  const textOpacity = useSharedValue(0.7);

  React.useEffect(() => {
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(0.7, {duration: 1000}),
      ),
      -1,
      true,
    );
  }, [textOpacity]);

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
        <LottieView
          style={styles.spinnerContainer}
          source={loadingBlocksAnimation}
          autoPlay
          resizeMode={'cover'}
        />
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
    width: 100,
    height: 100,
    transform: [{scale: 1.5}],
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    opacity: 0.5,
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
