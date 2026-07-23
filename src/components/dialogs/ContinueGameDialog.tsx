import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeInDown, ZoomIn} from 'react-native-reanimated';
import {CATEGORIES_ICONS} from '~/utils/consts';
import {CategorySelection, GridSize} from '~/utils/types';

const {width} = Dimensions.get('window');

type ContinueGameDialogProps = {
  visible: boolean;
  category: CategorySelection;
  gridSize: GridSize;
  wordsFound: number;
  totalWords: number;
  onContinue: () => void;
  onNewGame: () => void;
  onClose: () => void;
};

const ContinueGameDialog: React.FC<ContinueGameDialogProps> = ({
  visible,
  category,
  gridSize,
  wordsFound,
  totalWords,
  onContinue,
  onNewGame,
  onClose,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <Animated.View
          entering={ZoomIn.springify().damping(14).stiffness(160).mass(0.7)}
          style={styles.dialogContainer}>
          <TouchableOpacity activeOpacity={1}>
            <LinearGradient
              colors={['#994CFD', '#6F54FB']}
              style={styles.dialogGradient}>
              <Text style={styles.title}>Continue your game?</Text>

              <Animated.View
                entering={FadeInDown.delay(150)}
                style={styles.detailsCard}>
                <Text style={styles.categoryEmoji}>
                  {CATEGORIES_ICONS[category]}
                </Text>
                <View style={styles.detailsText}>
                  <Text style={styles.categoryName}>{category}</Text>
                  <Text style={styles.metaText}>{gridSize} grid</Text>
                </View>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressCount}>
                    {wordsFound}/{totalWords}
                  </Text>
                  <Text style={styles.progressLabel}>words</Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(250)}
                style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.buttonWrapper}
                  onPress={onNewGame}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
                    style={styles.button}>
                    <Text style={styles.buttonText}>New Game</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonWrapper}
                  onPress={onContinue}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#e77cff', '#d93cfc']}
                    style={styles.button}>
                    <Text style={styles.buttonText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
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
    shadowRadius: 8,
  },
  dialogGradient: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  detailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  categoryEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  detailsText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  progressBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
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

export default ContinueGameDialog;
