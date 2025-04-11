import {
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import React, {useEffect} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import {Canvas, Group, Path} from '@shopify/react-native-skia';
import {CategorySelection, GridSize} from '~/utils/types';

// Home icon SVG path
const homeIconPath =
  'M10.679 24.4854H17.4407V15.9541C17.4407 15.4151 17.0891 15.0635 16.5501 15.0635H11.5813C11.0305 15.0635 10.679 15.4151 10.679 15.9541V24.4854ZM6.09693 25.6924H21.9524C23.6165 25.6924 24.5891 24.7432 24.5891 23.1026V10.1533L22.7024 8.86426V22.6221C22.7024 23.3838 22.2923 23.8057 21.554 23.8057H6.49537C5.74537 23.8057 5.33521 23.3838 5.33521 22.6221V8.87598L3.44849 10.1533V23.1026C3.44849 24.7432 4.42115 25.6924 6.09693 25.6924ZM0.0734863 12.6494C0.0734863 13.1299 0.448486 13.5869 1.0813 13.5869C1.40943 13.5869 1.67896 13.4112 1.92505 13.2119L13.6555 3.36817C13.9133 3.13379 14.2297 3.13379 14.4876 3.36817L26.218 13.2119C26.4524 13.4112 26.7219 13.5869 27.0501 13.5869C27.6008 13.5869 28.0462 13.2471 28.0462 12.6846C28.0462 12.333 27.929 12.0987 27.6829 11.8877L15.4837 1.63379C14.6165 0.895508 13.5383 0.895508 12.6594 1.63379L0.448486 11.8877C0.190674 12.0987 0.0734863 12.3799 0.0734863 12.6494ZM21.6477 7.36426L24.5891 9.84863V4.43457C24.5891 3.91895 24.261 3.59082 23.7454 3.59082H22.4915C21.9876 3.59082 21.6477 3.91895 21.6477 4.43457V7.36426Z';

type WordDisplayProps = {
  word: SharedValue<string>;
  category: CategorySelection;
  size: GridSize;
  onGoHome: () => void;
};

const GameHeader: React.FC<WordDisplayProps> = ({
  word,
  category,
  size,
  onGoHome,
}) => {
  const [displayWord, setDisplayWord] = React.useState('');
  const animationProgress = useSharedValue(0);
  const lastWordEmpty = useSharedValue(true);

  useEffect(() => {
    const newEmpty = displayWord === '';
    animationProgress.value = withTiming(newEmpty ? 0 : 1);
    lastWordEmpty.value = newEmpty;
  }, [displayWord, animationProgress, lastWordEmpty]);

  useAnimatedReaction(
    () => word.value,
    currentValue => {
      runOnJS(setDisplayWord)(currentValue);
    },
  );

  const headerAnimatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animationProgress.value,
      [1, 0],
      ['rgba(39, 39, 39, 0.35)', 'rgba(231, 124, 255, 0.35)'],
    );

    return {
      backgroundColor,
    };
  }, [animationProgress]);

  return (
    <Animated.View
      style={[styles.headerContainer, headerAnimatedContainerStyle]}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify()
        .mass(0.3)
        .damping(12)
        .stiffness(100)}>
      {displayWord ? (
        // Show centered word when user is selecting
        <View style={styles.wordContainer}>
          <Text style={styles.wordText}>{displayWord}</Text>
        </View>
      ) : (
        // Show minimal header with home button and game info
        <View style={styles.headerContentContainer}>
          <TouchableOpacity
            onPress={onGoHome}
            style={styles.homeButton}
            activeOpacity={0.7}>
            <Canvas style={styles.canvas}>
              <Group transform={[{scale: 0.9}]} color={'#ffffffc0'}>
                <Path path={homeIconPath} style="fill" />
              </Group>
            </Canvas>
          </TouchableOpacity>

          <View style={styles.gameInfoContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.sizeBadge}>
              <Text style={styles.sizeText}>{size}</Text>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 5,
    left: 10,
    right: 10,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 10,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 3.84,
  },
  headerContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  canvas: {
    width: 25,
    height: 25,
  },
  gameInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 3,
    paddingVertical: 3,
    height: 32,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  categoryEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.89)',
    textTransform: 'capitalize',
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sizeText: {
    fontSize: 11,
    fontWeight: '600',
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
