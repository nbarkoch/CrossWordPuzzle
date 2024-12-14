import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const WordDisplay: React.FC<{word: SharedValue<string>}> = ({word}) => {
  const [displayWord, setDisplayWord] = React.useState('');

  useAnimatedReaction(
    () => word.value,
    currentValue => {
      runOnJS(setDisplayWord)(currentValue);
    },
  );

  return (
    displayWord !== '' && (
      <View style={styles.wordDisplay}>
        <Text style={styles.wordText}>{displayWord}</Text>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  wordDisplay: {
    position: 'absolute',
    top: 10,
    margin: 10,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#553F7Ed0',
  },
});

export default WordDisplay;
