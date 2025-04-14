import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {RootStackParamList} from './Navigation';
import {GameMode} from '~/utils/types';

type MainMenuProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;
};

const MainMenu: React.FC<MainMenuProps> = ({navigation}) => {
  const handleModeSelection = (mode: GameMode) => {
    switch (mode) {
      case 'classic': {
        navigation.navigate('GameOptions', {mode});
        break;
      }
      case 'daily': {
        navigation.navigate('GameOptions', {mode});
        break;
      }
      default: {
        break;
      }
    }
  };

  return (
    <LinearGradient style={styles.container} colors={['#994CFD', '#6F54FB']}>
      <Animated.View entering={FadeIn} style={styles.decorCircle} />
      <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Word Search</Text>
          <Text style={styles.subtitle}>Challenge Your Mind</Text>
        </View>

        <View style={styles.modesContainer}>
          <Pressable
            onPress={() => handleModeSelection('classic')}
            style={({pressed}) => [
              styles.modeButton,
              pressed && styles.buttonPressed,
            ]}>
            <LinearGradient
              colors={['#e77cff', '#d93cfc']}
              style={styles.modeGradient}>
              <Text style={styles.modeTitle}>Classic Mode</Text>
              <Text style={styles.modeDescription}>
                Find all words at your own pace
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => handleModeSelection('daily')}
            style={({pressed}) => [
              styles.modeButton,
              pressed && styles.buttonPressed,
            ]}>
            <LinearGradient
              colors={['#a855f7', '#994CFD']}
              style={styles.modeGradient}>
              <Text style={styles.modeTitle}>Daily Challenge</Text>
              <Text style={styles.modeDescription}>New puzzles every day</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => handleModeSelection('challenge')}
            style={({pressed}) => [
              styles.modeButton,
              pressed && styles.buttonPressed,
            ]}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.modeGradient}>
              <Text style={styles.modeTitle}>Word Wave</Text>
              <Text style={styles.modeDescription}>Race against the clock</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.bottomButtons}>
          <Pressable
            onPress={() => navigation.navigate('Leaderboard')}
            style={({pressed}) => [
              styles.bottomButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.bottomButtonText}>Leaderboard</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({pressed}) => [
              styles.bottomButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.bottomButtonText}>Settings</Text>
          </Pressable>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -50,
  },
  content: {
    width: '90%',
    maxWidth: 400,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
  },
  modesContainer: {
    gap: 16,
  },
  modeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    backgroundColor: 'black',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modeGradient: {
    padding: 20,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 40,
  },
  bottomButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainMenu;
