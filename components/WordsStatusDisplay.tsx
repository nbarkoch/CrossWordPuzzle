import React, {useEffect} from 'react';
import Animated, {FadeInDown, Layout} from 'react-native-reanimated';
import {FlatList, StyleSheet, Alert, View, Text} from 'react-native';
import {WordSequence} from '../utils/types';

type WordStatusDisplayProps = {
  placedWords: string[];
  foundSequences: WordSequence[];
  onGameComplete: () => void;
};

const WordStatusDisplay = ({
  placedWords,
  foundSequences,
  onGameComplete,
}: WordStatusDisplayProps) => {
  const wordsData = React.useMemo(
    () =>
      placedWords.map(word => ({
        word,
        isFound: foundSequences.some(sequence => sequence.word === word),
      })),
    [placedWords, foundSequences],
  );

  const renderItem = ({
    item,
  }: {
    item: {word: string; isFound: boolean};
    index: number;
  }) => {
    return (
      <Animated.View
        entering={FadeInDown}
        layout={Layout}
        style={[
          styles.wordBadge,
          item.isFound ? styles.foundBadge : styles.unfoundBadge,
        ]}>
        <Text style={[styles.wordText, item.isFound && styles.foundText]}>
          {item.word}
        </Text>
      </Animated.View>
    );
  };

  useEffect(() => {
    const normalizedPlacedWords = placedWords.map(word => word);
    const normalizedFoundWords = foundSequences.map(seq => seq.word);

    const allWordsFound = normalizedPlacedWords.every(word =>
      normalizedFoundWords.includes(word),
    );

    if (allWordsFound && placedWords.length > 0) {
      Alert.alert('Congratulations!', "You've found all the words!", [
        {
          text: 'Play Again',
          onPress: onGameComplete,
        },
      ]);
    }
  }, [foundSequences, placedWords, onGameComplete]);

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={wordsData}
        renderItem={renderItem}
        keyExtractor={item => item.word}
        style={styles.container}
        removeClippedSubviews={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  wordBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 5,
  },
  unfoundBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  foundBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  wordText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  foundText: {
    textDecorationLine: 'line-through',
    color: '#065F46',
  },
});

export default React.memo(WordStatusDisplay);
