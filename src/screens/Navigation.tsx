// Navigation.tsx
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';

import Game from './Game';
import GameOptions from './GameOptions';
import Leaderboard from './Leaderboard';
import MainMenu from './MainMenu';
import Settings from './Settings';
import {CategorySelection, GridSize} from '~/utils/types';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: {category: CategorySelection; blockSize: GridSize};
  Settings: undefined;
  GameOptions: {
    mode: 'classic' | 'timed' | 'challenge';
  };
  Leaderboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safeAreaContainer, {paddingTop: insets.top}]}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
          }}>
          <Stack.Screen name="MainMenu" component={MainMenu} />
          <Stack.Screen name="Game" component={Game} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="GameOptions" component={GameOptions} />
          <Stack.Screen name="Leaderboard" component={Leaderboard} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    height: '100%',
    width: '100%',
    backgroundColor: '#994CFD',
  },
});
