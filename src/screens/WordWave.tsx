import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import NavigationBar from '~/components/NavigationBar';
import {RootStackParamList} from './Navigation';
import {
  createWordWaveBoard,
  findWordWaveMoves,
  getMoveForPath,
  getWordFromPath,
  getWordWaveMoveScore,
  getWordWaveSelectionPath,
  pathContainsPosition,
  refillWordWaveBoard,
  WORD_WAVE_SIZE,
  WordWaveBoard,
  WordWavePosition,
  WordWaveRefillResult,
  WordWaveTile,
} from '~/utils/wordWave';

type WordWaveProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WordWave'>;
};

type TileProps = {
  tile: WordWaveTile;
  row: number;
  col: number;
  startPosition?: WordWavePosition;
  cellSize: number;
  selected: boolean;
  valid: boolean;
};

const getPathCacheKey = (path: WordWavePosition[]) =>
  path.map(position => `${position.row}:${position.col}`).join('|');

const Tile: React.FC<TileProps> = ({
  tile,
  row,
  col,
  startPosition,
  cellSize,
  selected,
  valid,
}) => {
  const initialCol = startPosition?.col ?? col;
  const initialRow = startPosition?.row ?? row;
  const translateX = useSharedValue(initialCol * cellSize);
  const translateY = useSharedValue(initialRow * cellSize);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
    ],
  }));

  useEffect(() => {
    translateX.value = withSpring(col * cellSize, {
      mass: 0.35,
      damping: 14,
      stiffness: 120,
    });
    translateY.value = withSpring(row * cellSize, {
      mass: 0.35,
      damping: 14,
      stiffness: 120,
    });
  }, [cellSize, col, row, translateX, translateY]);

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        {
          width: cellSize,
          height: cellSize,
        },
        animatedStyle,
      ]}
      pointerEvents="none">
      <View
        style={[
          styles.tile,
          selected && styles.tileSelected,
          valid && styles.tileValid,
        ]}>
        <Text style={styles.tileLetter}>{tile.letter}</Text>
      </View>
    </Animated.View>
  );
};

const WordWave: React.FC<WordWaveProps> = ({navigation}) => {
  const [board, setBoard] = useState<WordWaveBoard>(() =>
    createWordWaveBoard(),
  );
  const [selection, setSelection] = useState<WordWavePosition[]>([]);
  const [lastAttempts, setLastAttempts] = useState(0);
  const [lastInjectedWord, setLastInjectedWord] = useState<string>();
  const [hintIndex, setHintIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const selectionRef = useRef<WordWavePosition[]>([]);
  const startPositionRef = useRef<WordWavePosition | null>(null);
  const previousTilePositionsRef = useRef<Map<string, WordWavePosition>>(
    new Map(),
  );
  const spawnedTilePositionsRef = useRef<Map<string, WordWavePosition>>(
    new Map(),
  );
  const predictedRefillsRef = useRef<Map<string, WordWaveRefillResult>>(
    new Map(),
  );
  const {width} = useWindowDimensions();
  const boardSize = Math.min(width - 24, 380);
  const cellSize = boardSize / WORD_WAVE_SIZE;

  const moves = useMemo(() => findWordWaveMoves(board), [board]);
  const selectedWord = useMemo(
    () => getWordFromPath(board, selection),
    [board, selection],
  );
  const selectedMove = useMemo(
    () => getMoveForPath(board, selection),
    [board, selection],
  );
  const visibleWords = useMemo(() => {
    const usedWords = new Set<string>();

    return moves
      .filter(move => {
        if (usedWords.has(move.word)) {
          return false;
        }

        usedWords.add(move.word);
        return true;
      })
      .sort(
        (a, b) =>
          getWordWaveMoveScore(b) - getWordWaveMoveScore(a) ||
          b.word.length - a.word.length ||
          a.word.localeCompare(b.word),
      );
  }, [moves]);
  const renderedTiles = useMemo(
    () =>
      board.flatMap((rowTiles, row) =>
        rowTiles.map((tile, col) => ({tile, row, col})),
      ),
    [board],
  );

  useEffect(() => {
    let cancelled = false;
    const predictions = new Map<string, WordWaveRefillResult>();
    const predictedMoves = visibleWords.slice(0, 6);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = 0;

    predictedRefillsRef.current = predictions;

    const prepareNext = () => {
      if (cancelled || index >= predictedMoves.length) {
        return;
      }

      const move = predictedMoves[index];
      index += 1;

      predictions.set(getPathCacheKey(move.path), refillWordWaveBoard(board, move.path));
      timer = setTimeout(prepareNext, 20);
    };

    timer = setTimeout(prepareNext, 80);

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [board, visibleWords]);

  const removeSelection = (path: WordWavePosition[]) => {
    setIsResolving(true);
    startPositionRef.current = null;
    selectionRef.current = [];
    setSelection([]);

    requestAnimationFrame(() => {
      const previousPositions = new Map<string, WordWavePosition>();

      board.forEach((rowTiles, row) => {
        rowTiles.forEach((tile, col) => {
          previousPositions.set(tile.id, {row, col});
        });
      });

      const result =
        predictedRefillsRef.current.get(getPathCacheKey(path)) ??
        refillWordWaveBoard(board, path);
      const spawnedPositions = new Map<string, WordWavePosition>();
      const newTilesByCol = new Map<
        number,
        {tile: WordWaveTile; row: number; col: number}[]
      >();

      result.board.forEach((rowTiles, row) => {
        rowTiles.forEach((tile, col) => {
          if (previousPositions.has(tile.id)) {
            return;
          }

          const colTiles = newTilesByCol.get(col) ?? [];
          colTiles.push({tile, row, col});
          newTilesByCol.set(col, colTiles);
        });
      });

      newTilesByCol.forEach(colTiles => {
        const spawnOffset = colTiles.length;

        colTiles
          .sort((a, b) => a.row - b.row)
          .forEach(({tile, row, col}) => {
            spawnedPositions.set(tile.id, {row: row - spawnOffset, col});
          });
      });

      previousTilePositionsRef.current = previousPositions;
      spawnedTilePositionsRef.current = spawnedPositions;
      setBoard(result.board);
      setLastAttempts(result.attempts);
      setLastInjectedWord(result.injectedWord);
      setHintIndex(0);
      setIsResolving(false);
    });
  };

  const setSelectionPath = (path: WordWavePosition[]) => {
    selectionRef.current = path;
    setSelection(path);
  };

  const getPositionFromTouch = (event: GestureResponderEvent) => {
    const {locationX, locationY} = event.nativeEvent;
    const row = Math.floor(locationY / cellSize);
    const col = Math.floor(locationX / cellSize);

    if (row < 0 || row >= WORD_WAVE_SIZE || col < 0 || col >= WORD_WAVE_SIZE) {
      return null;
    }

    return {row, col};
  };

  const handleBoardTouch = (event: GestureResponderEvent) => {
    if (isResolving) {
      return;
    }

    const position = getPositionFromTouch(event);
    const startPosition = startPositionRef.current;

    if (position && startPosition) {
      setSelectionPath(getWordWaveSelectionPath(startPosition, position));
    }
  };

  const handleSelectionRelease = () => {
    if (isResolving) {
      return;
    }

    const move = getMoveForPath(board, selectionRef.current);

    if (move && !isResolving) {
      removeSelection(move.path);
    } else {
      startPositionRef.current = null;
    }
  };

  const highlightMove = (path: WordWavePosition[]) => {
    setSelectionPath(path);
  };

  const highlightNextMove = () => {
    const nextMove = visibleWords[hintIndex % visibleWords.length];

    if (!nextMove) {
      setSelectionPath([]);
      return;
    }

    setSelectionPath(nextMove.path);
    setHintIndex(index => index + 1);
  };

  return (
    <View style={styles.container}>
      <NavigationBar title="Word Wave" onBack={() => navigation.goBack()} />
      <LinearGradient
        colors={['#11283D', '#245E62', '#F2B35C']}
        style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{moves.length}</Text>
            <Text style={styles.statLabel}>Moves</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{visibleWords.length}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{lastAttempts || '-'}</Text>
            <Text style={styles.statLabel}>Refill</Text>
          </View>
        </View>

        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={event => {
            if (isResolving) {
              return;
            }

            const position = getPositionFromTouch(event);

            startPositionRef.current = position;
            setSelectionPath(position ? [position] : []);
          }}
          onResponderMove={handleBoardTouch}
          onResponderRelease={handleSelectionRelease}
          onResponderTerminate={handleSelectionRelease}
          style={[styles.board, {width: boardSize, height: boardSize}]}>
          {renderedTiles.map(({tile, row, col}) => {
              const position = {row, col};
              const selected = pathContainsPosition(selection, position);

              return (
                <Tile
                  key={tile.id}
                  tile={tile}
                  row={row}
                  col={col}
                  startPosition={
                    previousTilePositionsRef.current.get(tile.id) ??
                    spawnedTilePositionsRef.current.get(tile.id)
                  }
                  cellSize={cellSize}
                  selected={selected}
                  valid={selected && Boolean(selectedMove)}
                />
              );
            })}
        </View>

        <View style={styles.selectedPanel}>
          <View>
            <Text style={styles.panelLabel}>Selected</Text>
            <Text style={styles.selectedWord}>{selectedWord || '-'}</Text>
          </View>
          <Pressable
            disabled={!selectedMove || isResolving}
            onPress={() =>
              selectedMove && !isResolving && removeSelection(selectedMove.path)
            }
            style={({pressed}) => [
              styles.clearButton,
              (!selectedMove || isResolving) && styles.clearButtonDisabled,
              pressed && selectedMove && styles.clearButtonPressed,
            ]}>
            <Text style={styles.clearButtonText}>
              {isResolving ? '...' : 'Clear'}
            </Text>
          </Pressable>
        </View>

        {lastInjectedWord ? (
          <Text style={styles.injectedText}>Injected {lastInjectedWord}</Text>
        ) : null}

        <View style={styles.wordsPanel}>
          <View style={styles.wordsHeader}>
            <Text style={styles.panelLabel}>Available Words</Text>
            <Pressable
              disabled={visibleWords.length === 0}
              onPress={highlightNextMove}
              style={({pressed}) => [
                styles.hintButton,
                visibleWords.length === 0 && styles.clearButtonDisabled,
                pressed && styles.clearButtonPressed,
              ]}>
              <Text style={styles.hintButtonText}>Highlight</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.wordsWrap}
            showsVerticalScrollIndicator={false}>
            {visibleWords.map(move => (
              <Pressable
                key={`${move.word}:${move.path
                  .map(position => `${position.row}-${position.col}`)
                  .join('.')}`}
                onPress={() => highlightMove(move.path)}
                style={({pressed}) => [
                  styles.wordChip,
                  selectedWord === move.word && styles.wordChipSelected,
                  pressed && styles.wordChipPressed,
                ]}>
                <Text style={styles.wordChipText}>{move.word}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11283D',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
  },
  statsRow: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: '#DDEEF0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  board: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(13, 27, 42, 0.58)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  tileWrap: {
    position: 'absolute',
    padding: 3,
  },
  tile: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F1DF',
    borderWidth: 2,
    borderColor: '#A9C6B8',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  tileSelected: {
    backgroundColor: '#FDD56A',
    borderColor: '#FFFFFF',
  },
  tileValid: {
    backgroundColor: '#6FE6A8',
  },
  tilePressed: {
    transform: [{scale: 0.96}],
  },
  tileLetter: {
    color: '#182B38',
    fontSize: 22,
    fontWeight: '900',
  },
  selectedPanel: {
    width: '100%',
    maxWidth: 380,
    minHeight: 70,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelLabel: {
    color: '#DDEEF0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectedWord: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  clearButton: {
    minWidth: 86,
    borderRadius: 8,
    backgroundColor: '#123C4D',
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonDisabled: {
    opacity: 0.35,
  },
  clearButtonPressed: {
    opacity: 0.86,
    transform: [{scale: 0.98}],
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  injectedText: {
    width: '100%',
    maxWidth: 380,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  wordsPanel: {
    width: '100%',
    maxWidth: 380,
    flex: 1,
    minHeight: 110,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    padding: 12,
  },
  wordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hintButton: {
    borderRadius: 8,
    backgroundColor: '#123C4D',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  hintButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingTop: 10,
    paddingBottom: 4,
  },
  wordChip: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  wordChipSelected: {
    backgroundColor: '#6FE6A8',
  },
  wordChipPressed: {
    opacity: 0.85,
  },
  wordChipText: {
    color: '#17344A',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default WordWave;
