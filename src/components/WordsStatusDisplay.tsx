import React from 'react';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {FlatList, StyleSheet, Text} from 'react-native';
import {WordSequence} from '~/utils/types';
import LinearGradient from 'react-native-linear-gradient';
import {normalizeWord} from '~/utils/generate';
import {Banner} from './AdBanner';

type WordStatusDisplayProps = {
  normalizedPlacedWords: string[];
  foundSequences: WordSequence[];
};

const WordStatusDisplay = ({
  normalizedPlacedWords,
  foundSequences,
}: WordStatusDisplayProps) => {
  const wordsData = React.useMemo(
    () =>
      normalizedPlacedWords.map(word => ({
        word,
        isFound: foundSequences.some(
          sequence => sequence.word === normalizeWord(word),
        ),
      })),
    [normalizedPlacedWords, foundSequences],
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

  return (
    <LinearGradient
      colors={['transparent', '#c568ff', '#c568ff']}
      style={styles.container}>
      <FlatList
        horizontal
        data={wordsData}
        renderItem={renderItem}
        keyExtractor={item => item.word}
        style={styles.container}
        removeClippedSubviews={false}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingBottom: Banner.height,
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
    backgroundColor: '#f9d3ff',
    borderWidth: 1,
    borderColor: '#f9d3ff',
  },
  wordText: {
    fontSize: 16,
    color: '#553F7Ed0',
    fontWeight: '500',
  },
  foundText: {
    color: '#bf4fd1',
  },
});

export default React.memo(WordStatusDisplay);
