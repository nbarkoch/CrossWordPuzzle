import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';

import Animated, {FadeInDown} from 'react-native-reanimated';
import {RootStackParamList} from './Navigation';
import {GameMode} from '~/utils/types';
import {prepareGrid} from '~/utils/gridGenerationCache';
import {getDateSeed} from '~/utils/generate';
import {loadSavedGame, SavedGame} from '~/utils/gameStorage';
import ContinueGameDialog from '~/components/dialogs/ContinueGameDialog';

import SmallStar from '~/components/decorations/star';
import MenuButton from '~/components/MenuButton';
import {Banner} from '~/components/AdBanner';

type MainMenuProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;
};

const MainMenu: React.FC<MainMenuProps> = ({navigation}) => {
  const [classicSave, setClassicSave] = useState<SavedGame | null>(null);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyResumable, setDailyResumable] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);

  useEffect(() => {
    prepareGrid({category: 'general', gridSize: 'medium', mode: 'daily'});
  }, []);

  // Refresh saved-game state each time the menu regains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const [classic, daily] = await Promise.all([
          loadSavedGame('classic'),
          loadSavedGame('daily'),
        ]);

        if (!active) {
          return;
        }

        setClassicSave(classic && !classic.completed ? classic : null);

        const today = getDateSeed();
        if (daily && daily.dateSeed === today) {
          setDailyDone(daily.completed);
          setDailyResumable(!daily.completed);
        } else {
          setDailyDone(false);
          setDailyResumable(false);
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const startNewClassicGame = () => {
    setShowContinueDialog(false);
    navigation.navigate('GameOptions', {mode: 'classic'});
  };

  const continueClassicGame = () => {
    if (!classicSave) {
      return;
    }
    setShowContinueDialog(false);
    navigation.navigate('Game', {
      category: classicSave.category,
      blockSize: classicSave.gridSize,
      mode: 'classic',
      resume: true,
    });
  };

  const handleModeSelection = (mode: GameMode) => {
    switch (mode) {
      case 'classic': {
        if (classicSave) {
          setShowContinueDialog(true);
        } else {
          navigation.navigate('GameOptions', {mode});
        }
        break;
      }
      case 'daily': {
        if (dailyDone) {
          break;
        }
        navigation.navigate('Game', {
          category: 'general',
          blockSize: 'medium',
          mode,
          resume: dailyResumable,
        });
        break;
      }
      case 'challenge': {
        navigation.navigate('WordWave');
        break;
      }
      default: {
        break;
      }
    }
  };

  return (
    <LinearGradient
      style={styles.container}
      colors={['#4A20A4', '#8437DE', '#662FCA', '#471EA0']}>
      <Animated.View entering={FadeInDown.delay(200)}>
        <View style={styles.titleContainer}>
          <Image
            style={styles.titleImage}
            resizeMode="contain"
            source={require('~/assets/imgs/title.png')}
          />
          <View style={styles.subtitleBadge}>
            <SmallStar size={15} />
            <Text style={styles.subtitle}>Word Search Puzzle</Text>
            <SmallStar size={15} />
          </View>
        </View>

        <View style={styles.modesWrapper}>
          <View style={styles.modesContainer}>
            <MenuButton
              onPress={() => handleModeSelection('classic')}
              title={'Classic Mode'}
              subtitle={
                classicSave
                  ? `Continue your ${classicSave.category} puzzle`
                  : 'Find all words at your own pace'
              }
              image={require('~/assets/imgs/search.png')}
              tag={classicSave ? 'RESUME' : undefined}
            />

            <MenuButton
              onPress={() => handleModeSelection('daily')}
              disabled={dailyDone}
              title={'Daily Challenge'}
              subtitle={
                dailyDone
                  ? 'Completed — new puzzle tomorrow'
                  : dailyResumable
                    ? "Resume today's challenge"
                    : 'New puzzles every day'
              }
              image={require('~/assets/imgs/daily.png')}
              tag={dailyDone ? '✓ DONE' : dailyResumable ? 'RESUME' : undefined}
            />

            <MenuButton
              onPress={() => handleModeSelection('challenge')}
              title={'Wave Puzzle'}
              subtitle={'Find falling word sets'}
              image={require('~/assets/imgs/wave.png')}
            />
          </View>
        </View>
      </Animated.View>

      {classicSave && (
        <ContinueGameDialog
          visible={showContinueDialog}
          category={classicSave.category}
          gridSize={classicSave.gridSize}
          wordsFound={classicSave.sequences.length}
          totalWords={classicSave.gridData.placedWords.length}
          onContinue={continueClassicGame}
          onNewGame={startNewClassicGame}
          onClose={() => setShowContinueDialog(false)}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 50 + Banner.height,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleImage: {
    width: '100%',
    height: 250,
    marginTop: 20,
    marginBottom: -20,
  },
  subtitleBadge: {
    backgroundColor: '#5F28B4',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modesWrapper: {
    alignItems: 'center',
  },
  modesContainer: {
    width: '90%',
  },
});

export default MainMenu;
