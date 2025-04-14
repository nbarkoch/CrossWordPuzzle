import React from 'react';
import Animated, {FadeInDown, SharedValue} from 'react-native-reanimated';
import {FlatList, StyleSheet, Text, View, Dimensions} from 'react-native';
import {WordSequence} from '~/utils/types';
import LinearGradient from 'react-native-linear-gradient';
import {normalizeWord} from '~/utils/generate';
import {Banner} from './AdBanner';
import StripeProgress from './StripeProgression';

const {width} = Dimensions.get('window');

type WordStatusDisplayProps = {
  normalizedPlacedWords: string[];
  foundSequences: WordSequence[];
  progress: SharedValue<number>;
};

const WordStatusDisplay = ({
  normalizedPlacedWords,
  foundSequences,
  progress,
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

  const wordsFound = foundSequences.length;
  const totalWords = normalizedPlacedWords.length;

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
      colors={['transparent', '#c568ff']}
      style={styles.container}>
      <View style={styles.progressContainer}>
        <StripeProgress
          width={300}
          height={30}
          progress={progress}
          stripeWidth={5}
          compression={3}
          stripeSpeed={1500}
          wordsFound={wordsFound}
          totalWords={totalWords}
        />
      </View>
      <View style={styles.listContainer}>
        <FlatList
          horizontal
          data={wordsData}
          renderItem={renderItem}
          keyExtractor={item => item.word}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: Banner.height + 20,
    width: '100%',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 7,
  },

  listContainer: {
    width: width,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 5,
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
