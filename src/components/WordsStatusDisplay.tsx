import React from 'react';
import Animated, {FadeInDown, SharedValue} from 'react-native-reanimated';
import {FlatList, StyleSheet, Text, View, Dimensions} from 'react-native';
import {WordSequence} from '~/utils/types';
import {normalizeWord} from '~/utils/generate';
import StripeProgress from './StripeProgression';
import LinearGradient from 'react-native-linear-gradient';

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
        <LinearGradient
          style={styles.progressGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          colors={['#8443df', '#683cd5']}>
          <View style={styles.wordCountContainer}>
            <Text style={styles.wordCountText}>
              {wordsFound}/{totalWords} WORDS
            </Text>
          </View>
          <StripeProgress
            width={Math.min(250, width * 0.48)}
            height={30}
            progress={progress}
            stripeWidth={6}
            compression={2.5}
            stripeSpeed={1500}
          />
        </LinearGradient>
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
    flex: 1,
    width: '100%',
  },
  progressShell: {
    width: width - 46,
    minHeight: 46,
    alignSelf: 'center',
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A070E1',
    backgroundColor: 'rgb(106, 45, 203)',
    elevation: 3,
    shadowColor: '#000',
    overflow: 'hidden',
  },
  progressGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: 20,
    paddingEnd: 10,
    paddingVertical: 6,
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
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  wordBadge: {
    minWidth: 96,
    padding: 1,
    borderRadius: 22,
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
