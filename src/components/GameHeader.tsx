import {SharedValue, useAnimatedReaction} from 'react-native-reanimated';
import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import {Canvas, Group, Path} from '@shopify/react-native-skia';
import {GridSize} from '~/utils/types';
import {scheduleOnRN} from 'react-native-worklets';
import LinearGradient from 'react-native-linear-gradient';

const homeIconPath =
  'M3.65 14.35L14.95 4.45C15.55 3.92 16.45 3.92 17.05 4.45L28.35 14.35C29.15 15.05 28.65 16.35 27.58 16.35H25.15V26.15C25.15 27.17 24.32 28 23.3 28H19.25V21.95C19.25 21.32 18.73 20.8 18.1 20.8H13.9C13.27 20.8 12.75 21.32 12.75 21.95V28H8.7C7.68 28 6.85 27.17 6.85 26.15V16.35H4.42C3.35 16.35 2.85 15.05 3.65 14.35Z';
type WordDisplayProps = {
  word: SharedValue<string>;
  mode: string;
  category: string;
  size: GridSize;
  onGoHome: () => void;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const GameHeader: React.FC<WordDisplayProps> = ({
  word,
  category,
  mode,
  size,
  onGoHome,
}) => {
  const [displayWord, setDisplayWord] = React.useState('');

  useAnimatedReaction(
    () => word.value,
    currentValue => {
      scheduleOnRN(setDisplayWord, currentValue);
    },
  );

  const hasWord = displayWord.length > 0;

  return (
    <View style={styles.headerWrapper}>
      <AnimatedLinearGradient
        key={hasWord ? 'word-header' : 'info-header'}
        style={[
          styles.headerContainer,
          hasWord ? styles.wordHeader : styles.infoHeader,
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        colors={
          hasWord
            ? ['#8925b453', '#953be396', '#8925b453']
            : ['#8c3be396', '#4925b400', '#4925b400']
        }
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(90)}
        layout={LinearTransition.springify()
          .mass(0.3)
          .damping(12)
          .stiffness(100)}>
        {hasWord ? (
          <View style={styles.wordContainer}>
            <Text style={styles.wordText}>{displayWord}</Text>
          </View>
        ) : (
          <View style={styles.headerContentContainer}>
            <TouchableOpacity
              onPress={onGoHome}
              style={styles.homeButton}
              activeOpacity={0.7}>
              <Canvas style={styles.canvas}>
                <Group transform={[{scale: 0.9}]} color={'#ffffff'}>
                  <Path path={homeIconPath} style="fill" />
                </Group>
              </Canvas>
            </TouchableOpacity>
            <View style={styles.gameInfoContainer}>
              <View style={styles.badge}>
                <Text style={styles.categoryText}>{mode}</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.badge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.badge}>
                <Text style={styles.sizeText}>{size}</Text>
              </View>
            </View>
          </View>
        )}
      </AnimatedLinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    borderWidth: 1,
    borderColor: '#9d46e9bc',
    position: 'absolute',
    top: 5,
    left: 10,
    right: 10,
    zIndex: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerContainer: {
    padding: 5,
  },
  infoHeader: {
    backgroundColor: '#ba52ff31',
  },
  wordHeader: {},
  headerContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B96EFA',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  canvas: {
    width: 30,
    height: 30,
  },
  gameInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8147d7',
    borderRadius: 18,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    height: 44,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 36,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 16,
  },
  separator: {
    width: 1,
    height: '58%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  categoryEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.89)',
    textTransform: 'capitalize',
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.89)',
    textTransform: 'capitalize',
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.89)',
    letterSpacing: 1,
  },
});

export default GameHeader;
