import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  BounceIn,
  withSpring,
} from 'react-native-reanimated';

const {width} = Dimensions.get('window');

type EndGameDialogProps = {
  visible: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  wordsFound?: number;
  totalWords?: number;
};

// Star component that encapsulates its own animation
const Star = ({
  angle,
  radius,
  delay,
}: {
  angle: number;
  radius: number;
  delay: number;
}) => {
  const starOpacity = useSharedValue(0);
  const starScale = useSharedValue(0.5);

  // Calculate position based on angle and distance
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  useEffect(() => {
    starOpacity.value = withDelay(
      800 + delay,
      withRepeat(
        withSequence(
          withTiming(1, {duration: 500}),
          withTiming(0.3, {duration: 800}),
        ),
        -1,
        true,
      ),
    );

    starScale.value = withDelay(
      800 + delay,
      withRepeat(
        withSequence(
          withTiming(1.2, {duration: 500}),
          withTiming(0.8, {duration: 800}),
        ),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(starOpacity);
      cancelAnimation(starScale);
    };
  }, [delay, starOpacity, starScale]);

  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
    transform: [{translateX: x}, {translateY: y}, {scale: starScale.value}],
  }));

  return <Animated.Text style={[styles.star, starStyle]}>✦</Animated.Text>;
};

// Starburst animation component
const StarburstAnimation = () => {
  // Animated values
  const primaryScale = useSharedValue(0.8);
  const primaryRotation = useSharedValue(0);
  const primaryOpacity = useSharedValue(0.7);

  const secondaryScale = useSharedValue(0.7);
  const secondaryRotation = useSharedValue(0);
  const secondaryOpacity = useSharedValue(0.6);

  const trophyScale = useSharedValue(0);

  useEffect(() => {
    // Primary starburst animation
    primaryScale.value = withRepeat(
      withSequence(
        withTiming(1.1, {duration: 1500}),
        withTiming(0.9, {duration: 1500}),
      ),
      -1,
      true,
    );

    primaryRotation.value = withRepeat(
      withTiming(360, {duration: 15000}),
      -1,
      false,
    );

    primaryOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, {duration: 1000}),
        withTiming(0.7, {duration: 1000}),
      ),
      -1,
      true,
    );

    // Secondary starburst animation (reversed direction)
    secondaryScale.value = withRepeat(
      withSequence(
        withTiming(0.9, {duration: 1800}),
        withTiming(0.7, {duration: 1800}),
      ),
      -1,
      true,
    );

    secondaryRotation.value = withRepeat(
      withTiming(-360, {duration: 12000}),
      -1,
      false,
    );

    secondaryOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, {duration: 1300}),
        withTiming(0.6, {duration: 1300}),
      ),
      -1,
      true,
    );

    // Trophy animation
    trophyScale.value = withDelay(
      400,
      withSpring(1, {
        mass: 1,
        damping: 9,
        stiffness: 100,
      }),
    );

    return () => {
      // Clean up animations
      cancelAnimation(primaryScale);
      cancelAnimation(primaryRotation);
      cancelAnimation(primaryOpacity);
      cancelAnimation(secondaryScale);
      cancelAnimation(secondaryRotation);
      cancelAnimation(secondaryOpacity);
      cancelAnimation(trophyScale);
    };
  }, [
    primaryOpacity,
    primaryRotation,
    primaryScale,
    secondaryOpacity,
    secondaryRotation,
    secondaryScale,
    trophyScale,
  ]);

  // Animated styles
  const primaryRayStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: primaryScale.value},
      {rotate: `${primaryRotation.value}deg`},
    ],
    opacity: primaryOpacity.value,
    backgroundColor: '#e77cff',
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{scale: trophyScale.value}],
  }));

  return (
    <View style={styles.starburst}>
      <Animated.View style={[styles.starburstRay, primaryRayStyle]} />
      <View style={styles.starContainer}>
        {Array.from({length: 5}).map((_, i) => (
          <Star
            key={i}
            angle={(i * Math.PI * 2) / 5}
            radius={35}
            delay={i * 150}
          />
        ))}
      </View>
      <Animated.View style={trophyStyle}>
        <Text style={styles.trophyEmoji}>🏆</Text>
      </Animated.View>
    </View>
  );
};

const EndGameDialog: React.FC<EndGameDialogProps> = ({
  visible,
  onPlayAgain,
  onGoHome,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={BounceIn} style={styles.dialogContainer}>
          <LinearGradient
            colors={['#994CFD', '#6F54FB']}
            style={styles.dialogGradient}>
            <Animated.View entering={FadeIn.delay(300)}>
              <View style={styles.starburstContainer}>
                <StarburstAnimation />
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(400).springify()}
              style={styles.congratsText}>
              Congratulations!
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(500).springify()}
              style={styles.messageText}>
              You've found all the words!
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(700).springify()}
              style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={onGoHome}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
                  style={styles.button}>
                  <Text style={styles.buttonText}>Home</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={onPlayAgain}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#e77cff', '#d93cfc']}
                  style={styles.button}>
                  <Text style={styles.buttonText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dialogGradient: {
    padding: 24,
    alignItems: 'center',
  },
  starburstContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: 100,
    marginBottom: 16,
  },
  starburst: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  starburstRay: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  trophyEmoji: {
    fontSize: 50,
    zIndex: 10,
    textAlign: 'center',
  },
  starContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    color: 'white',
    fontSize: 16,
    textShadowColor: '#FFD700',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 4,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  messageText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 14,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    paddingTop: 24,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EndGameDialog;
