import React from 'react';
import GridLetters from '~/components/GridLetters';
import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamList} from './Navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type GameProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;
};

function Game({navigation}: GameProps) {
  const routeParams = useRoute<RouteProp<RootStackParamList, 'Game'>>().params;
  const goToMenu = () => navigation.navigate('MainMenu');
  return (
    <GridLetters
      goToMenu={goToMenu}
      category={routeParams.category}
      gridSize={routeParams.blockSize}
      mode={routeParams.mode}
    />
  );
}

export default Game;
