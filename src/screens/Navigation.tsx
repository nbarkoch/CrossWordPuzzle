// Navigation.tsx
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';

import Game from './Game';
import GameOptions from './GameOptions';
import Leaderboard from './Leaderboard';
import MainMenu from './MainMenu';
import Settings from './Settings';

export type RootStackParamList = {
  MainMenu: undefined;
  Game: {category: string; size: string};
  Settings: undefined;
  GameOptions: {
    mode: 'classic' | 'timed' | 'challenge';
  };
  Leaderboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
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
  );
}
