import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

const WordDisplay: React.FC<{word: SharedValue<string>}> = ({word}) => {
  const [displayWord, setDisplayWord] = React.useState('');

  useAnimatedReaction(
    () => word.value,
    currentValue => {
      runOnJS(setDisplayWord)(currentValue);
    },
  );

  return (
    displayWord && (
      <Animated.View
        style={styles.wordDisplay}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition.springify()
          .mass(0.3)
          .damping(12)
          .stiffness(100)}>
        <Text style={styles.wordText}>{displayWord}</Text>
      </Animated.View>
    )
  );
};

const styles = StyleSheet.create({
  wordDisplay: {
    position: 'absolute',
    top: 5,
    margin: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(39, 39, 39, 0.43)',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.89)',
  },
});

export default WordDisplay;
