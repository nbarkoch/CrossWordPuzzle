import React from 'react';
import GridLetters from '../components/GridLetters';
import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamList} from './Navigation';
import {GRID_SIZES} from '../utils/blockCalcs';
import {wordsDictionary} from '../data/english';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type GameProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;
};

function Game({navigation}: GameProps) {
  const routeParams = useRoute<RouteProp<RootStackParamList, 'Game'>>().params;
  const {blockSize} = GRID_SIZES[routeParams.blockSize];
  const words = wordsDictionary[routeParams.category];
  const goToMenu = () => navigation.navigate('MainMenu');
  return (
    <>
      <GridLetters
        blockSize={blockSize}
        words={words}
        goToMenu={goToMenu}
        category={routeParams.category}
        gridSize={routeParams.blockSize}
      />
    </>
  );
}

export default Game;
