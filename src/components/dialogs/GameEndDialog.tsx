import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Dimensions, Modal, Image} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeInDown, BounceIn} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import DialogButton from './DialogButton';
import SmallStar from '../decorations/star';

const {width} = Dimensions.get('window');

type EndGameDialogProps = {
  visible: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  wordsFound?: number;
  totalWords?: number;
  resetEnabled?: boolean;
};

const EndGameDialog: React.FC<EndGameDialogProps> = ({
  visible,
  onPlayAgain,
  onGoHome,
  resetEnabled,
}) => {
  const confettiAnimation = useRef<LottieView>(null);

  useEffect(() => {
    // Play confetti animation when dialog becomes visible
    if (visible && confettiAnimation.current) {
      confettiAnimation.current.play();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.modalOverlay}>
        {/* Confetti animation that overlays the entire screen */}
        <View style={styles.confettiContainer}>
          <LottieView
            ref={confettiAnimation}
            source={require('~/assets/party.json')}
            style={styles.confettiAnimation}
            loop={false}
            autoPlay={false}
            resizeMode="cover"
            speed={0.75}
          />
        </View>

        <Animated.View entering={BounceIn} style={styles.dialogContainer}>
          <LottieView
            source={require('~/assets/reward.json')}
            style={styles.rewardAnimation}
            loop
            autoPlay
            resizeMode="cover"
            speed={0.75}
          />
          <View style={styles.card}>
            <LinearGradient
              colors={['#E3CEF5', '#B496D8']}
              style={styles.dialogGradient}>
              <View style={styles.dialogContent}>
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
                <View style={styles.divider}>
                  <LinearGradient
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    colors={['#FBF6FC', '#D9BCFC']}
                    style={styles.dividerLine}
                  />
                  <SmallStar size={15} color="#D9BCFC" />
                  <LinearGradient
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    colors={['#D9BCFC', '#FBF6FC']}
                    style={styles.dividerLine}
                  />
                </View>
                <Animated.View
                  entering={FadeInDown.delay(700).springify()}
                  style={styles.buttonsContainer}>
                  <DialogButton
                    text="Home"
                    type="secondary"
                    onPress={onGoHome}
                  />
                  {resetEnabled && (
                    <DialogButton
                      text="Play Again"
                      type="primary"
                      onPress={onPlayAgain}
                    />
                  )}
                </Animated.View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.starburstContainer}>
            <View style={styles.starburstOuter}>
              <View style={styles.starburstInner}>
                <LinearGradient
                  colors={['#9C5DEA', '#622BC1']}
                  style={styles.starburstGradient}>
                  <Image
                    style={styles.starImage}
                    source={require('~/assets/imgs/star.png')}
                  />
                </LinearGradient>
              </View>
            </View>
          </View>
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
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  confettiAnimation: {
    width: '100%',
    height: '100%',
  },
  rewardAnimation: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -110,
    height: '100%',
    alignSelf: 'center',
    opacity: 0.5,
    transform: [{scale: 0.65}],
  },
  dialogContainer: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#5d25a296',
    zIndex: 2,
  },
  card: {
    maxWidth: width * 0.85,
    borderRadius: 35,
    overflow: 'hidden',
  },
  dialogGradient: {
    padding: 5,
  },
  dialogContent: {
    backgroundColor: '#FBF6FC',
    borderRadius: 30,
    gap: 10,
    alignItems: 'center',
    paddingTop: 60,
  },
  divider: {
    flexDirection: 'row',
    paddingHorizontal: 50,
    alignItems: 'center',
    gap: 5,
  },
  dividerLine: {
    height: 1,
    flex: 1,
  },
  starburstContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: -30,
    zIndex: 10,
  },
  starburstOuter: {
    elevation: 8,
    shadowColor: '#48375a',
    shadowOpacity: 0.5,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 3,
    backgroundColor: '#F9F8FC',
    borderColor: '#dad8e2',
    borderWidth: 1,
    borderRadius: 70,
    padding: 5,
  },
  starburstInner: {
    backgroundColor: '#F9F8FC',
    borderWidth: 1,
    borderColor: '#dad8e2',
    overflow: 'hidden',
    borderRadius: 70,
  },
  starburstGradient: {
    padding: 2,
  },
  starImage: {
    width: 70,
    height: 70,
  },
  congratsText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#4B2491',
  },
  messageText: {
    fontSize: 18,
    color: '#745BBB',
    marginBottom: 14,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    paddingTop: 5,
  },
});

export default EndGameDialog;
