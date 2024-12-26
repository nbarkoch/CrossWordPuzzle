import React from 'react';
import GridLetters from '../components/GridLetters';
import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamList} from './Navigation';
import {GRID_SIZES} from '../utils/blockCalcs';
import {wordsDictionary} from '../data/english';

function Game() {
  const routeParams = useRoute<RouteProp<RootStackParamList, 'Game'>>().params;
  const {blockSize} = GRID_SIZES[routeParams.blockSize];
  const words = wordsDictionary[routeParams.category];
  return <GridLetters blockSize={blockSize} words={words} />;
}

export default Game;
