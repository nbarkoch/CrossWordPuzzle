import React from 'react';
import Animated, {FadeInDown, SharedValue} from 'react-native-reanimated';
import {FlatList, StyleSheet, Text, View, Dimensions} from 'react-native';
import {WordSequence} from '~/utils/types';
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
        <View style={styles.wordCard}>
          <Text style={[styles.wordText, item.isFound && styles.foundText]}>
            {item.word}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressShell}>
        <View style={styles.wordCountContainer}>
          <Text style={styles.wordCountText}>
            {wordsFound}/{totalWords} WORDS
          </Text>
        </View>
        <StripeProgress
          width={Math.min(250, width * 0.48)}
          height={31}
          progress={progress}
          stripeWidth={6}
          compression={2.5}
          stripeSpeed={1500}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: Banner.height + 2,
    width: '100%',
  },
  progressShell: {
    width: width - 46,
    minHeight: 46,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    backgroundColor: 'rgba(105, 45, 203, 0.52)',
  },
  wordCountContainer: {
    minWidth: 112,
    paddingRight: 8,
  },
  wordCountText: {
    color: '#FFFFFFf0',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0,
  },

  listContainer: {
    width: width,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 5,
  },
  wordBadge: {
    minWidth: 96,
    padding: 1,
    borderRadius: 22,
    marginHorizontal: 6,
    marginTop: 5,
    marginBottom: 10,
    shadowColor: '#9c6acb',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 5,
    elevation: 5,
    borderColor: '#6a2399',
    borderWidth: 1,
  },
  wordCard: {
    borderWidth: 1.5,
    borderColor: '#b94fff2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    alignItems: 'center',
  },
  unfoundBadge: {
    backgroundColor: '#FFF8FF',
  },
  foundBadge: {
    backgroundColor: '#FDDCF6',
  },
  wordText: {
    fontSize: 15,
    color: '#4A2C85',
    fontWeight: '800',
    letterSpacing: 0,
  },
  foundText: {
    color: '#D843B7',
  },
});

export default React.memo(WordStatusDisplay);
