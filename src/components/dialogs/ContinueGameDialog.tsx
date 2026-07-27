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
import DialogButton from './DialogButton';

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
              <View style={styles.dialogContent}>
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
                  <DialogButton
                    onPress={onNewGame}
                    text={'New Game'}
                    type="secondary"
                  />
                  <DialogButton
                    onPress={onContinue}
                    text={'Continue'}
                    type="primary"
                  />
                </Animated.View>
              </View>
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
    borderRadius: 35,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#5d25a296',
  },
  dialogGradient: {
    padding: 5,
  },
  dialogContent: {
    paddingTop: 24,
    backgroundColor: '#F6EEFD',
    borderRadius: 30,
    gap: 20,
    borderWidth: 1,
    borderColor: '#7630de',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2F1172',
    textAlign: 'center',
  },
  detailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E4FD',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7D5FC',
    marginHorizontal: 30,
  },
  categoryEmoji: {
    fontSize: 36,
    marginRight: 14,
    backgroundColor: '#7445E1',
    borderRadius: 50,
    padding: 5,
    borderWidth: 1,
    borderColor: '#7946ED',
  },
  detailsText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#331378',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 13,
    color: '#331378c0',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  progressBadge: {
    alignItems: 'center',
    backgroundColor: '#430eb539',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#430eb5bb',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e087faa',
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    marginHorizontal: 15,
    justifyContent: 'center',
    gap: 15,
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
