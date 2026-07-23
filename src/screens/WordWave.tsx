import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import NavigationBar from '~/components/NavigationBar';
import {RootStackParamList} from './Navigation';
import {
  applyWordWaveTimedRowDrop,
  applyWordWaveTimedSelectionFast,
  createWordWaveBoard,
  findWordWaveMoves,
  getMoveForPath,
  getWordFromPath,
  getWordWaveMoveScore,
  getWordWaveSelectionPath,
  pathContainsPosition,
  WORD_WAVE_SIZE,
  WordWaveBoard,
  WordWavePosition,
  WordWaveTile,
} from '~/utils/wordWave';

type WordWaveProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WordWave'>;
};

type TileProps = {
  tile: WordWaveTile;
  row: number;
  col: number;
  cellSize: number;
  selected: boolean;
  valid: boolean;
  hidden: boolean;
  spawnState?: WordWaveTileSpawnState;
  onSpawnConsumed: (tileId: string) => void;
};

type WordWaveTileSpawnState = {
  startPosition: WordWavePosition;
  delayMs: number;
};

const WORD_WAVE_ROW_DROP_SECONDS = 10;
const tileSpringConfig = {
  mass: 0.35,
  damping: 14,
  stiffness: 120,
};
const TILE_SPAWN_COLUMN_DELAY_MS = 16;
const TILE_SPAWN_STACK_DELAY_MS = 42;
const WORD_WAVE_PENDING_DROP_PENALTY = 2;

const getNewTileSpawnPositions = (
  previousBoard: WordWaveBoard,
  nextBoard: WordWaveBoard,
) => {
  const previousTileIds = new Set(
    previousBoard.flatMap(row => row.map(tile => tile.id)),
  );
  const newTilesByColumn = new Map<
    number,
    {tile: WordWaveTile; row: number; col: number}[]
  >();

  nextBoard.forEach((rowTiles, row) => {
    rowTiles.forEach((tile, col) => {
      if (previousTileIds.has(tile.id)) {
        return;
      }

      const columnTiles = newTilesByColumn.get(col) ?? [];
      columnTiles.push({tile, row, col});
      newTilesByColumn.set(col, columnTiles);
    });
  });

  const spawnPositions = new Map<string, WordWaveTileSpawnState>();

  newTilesByColumn.forEach(columnTiles => {
    const spawnDistance = columnTiles.length;

    columnTiles
      .sort((a, b) => a.row - b.row)
      .forEach(({tile, row, col}, index) => {
        const bottomToTopIndex = columnTiles.length - 1 - index;

        spawnPositions.set(tile.id, {
          startPosition: {
            row: row - spawnDistance,
            col,
          },
          delayMs:
            col * TILE_SPAWN_COLUMN_DELAY_MS +
            bottomToTopIndex * TILE_SPAWN_STACK_DELAY_MS,
        });
      });
  });

  return spawnPositions;
};

const Tile: React.FC<TileProps> = ({
  tile,
  row,
  col,
  cellSize,
  selected,
  valid,
  hidden,
  spawnState,
  onSpawnConsumed,
}) => {
  const startPosition = spawnState?.startPosition;
  const consumedSpawnIdRef = useRef<string | null>(null);
  const translateX = useSharedValue(
    (startPosition?.col ?? col) * cellSize,
  );
  const translateY = useSharedValue(
    (startPosition?.row ?? row) * cellSize,
  );
  const letterTranslateX = useSharedValue(0);
  const letterOpacity = useSharedValue(1);
  const tileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}, {translateY: translateY.value}],
  }));
  const letterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: letterOpacity.value,
    transform: [{translateX: letterTranslateX.value}],
  }));

  useLayoutEffect(() => {
    const targetX = col * cellSize;
    const targetY = row * cellSize;

    if (!startPosition) {
      translateX.value = withSpring(targetX, tileSpringConfig);
      translateY.value = withSpring(targetY, tileSpringConfig);
      return;
    }

    if (consumedSpawnIdRef.current === tile.id) {
      translateX.value = withSpring(targetX, tileSpringConfig);
      translateY.value = withSpring(targetY, tileSpringConfig);
      return;
    }

    consumedSpawnIdRef.current = tile.id;
    translateX.value = startPosition.col * cellSize;
    translateY.value = startPosition.row * cellSize;
    translateX.value = withDelay(
      spawnState.delayMs,
      withSpring(targetX, tileSpringConfig),
    );
    translateY.value = withDelay(
      spawnState.delayMs,
      withSpring(targetY, tileSpringConfig, finished => {
        if (finished) {
          runOnJS(onSpawnConsumed)(tile.id);
        }
      }),
    );
  }, [
    cellSize,
    col,
    onSpawnConsumed,
    spawnState?.delayMs,
    startPosition,
    startPosition?.col,
    startPosition?.row,
    row,
    tile.id,
    translateX,
    translateY,
  ]);

  useEffect(() => {
    letterTranslateX.value = cellSize * 0.28;
    letterOpacity.value = 0;
    letterTranslateX.value = withSpring(0, {
      mass: 0.25,
      damping: 12,
      stiffness: 150,
    });
    letterOpacity.value = withTiming(1, {duration: 140});
  }, [cellSize, letterOpacity, letterTranslateX, tile.letter]);

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        {
          width: cellSize,
          height: cellSize,
        },
        tileAnimatedStyle,
      ]}
      pointerEvents="none">
      <Animated.View
        style={[
          styles.tile,
          selected && styles.tileSelected,
          valid && styles.tileValid,
          hidden && styles.tileHidden,
        ]}>
        <Animated.Text style={[styles.tileLetter, letterAnimatedStyle]}>
          {tile.letter}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

const WordWave: React.FC<WordWaveProps> = ({navigation}) => {
  const [board, setBoard] = useState<WordWaveBoard>(() =>
    createWordWaveBoard(),
  );
  const [selection, setSelection] = useState<WordWavePosition[]>([]);
  const [dropSecondsLeft, setDropSecondsLeft] = useState(
    WORD_WAVE_ROW_DROP_SECONDS,
  );
  const [pressureScore, setPressureScore] = useState(0);
  const [arcadeScore, setArcadeScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [rowDrops, setRowDrops] = useState(0);
  const [lastRepairCount, setLastRepairCount] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [hiddenTileIds, setHiddenTileIds] = useState<Set<string>>(new Set());
  const [pendingRowDrop, setPendingRowDrop] = useState(false);
  const isResolvingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pendingRowDropRef = useRef(false);
  const dropSecondsLeftRef = useRef(WORD_WAVE_ROW_DROP_SECONDS);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRef = useRef<WordWavePosition[]>([]);
  const startPositionRef = useRef<WordWavePosition | null>(null);
  const newTileSpawnPositionsRef = useRef<Map<string, WordWaveTileSpawnState>>(
    new Map(),
  );
  const [, setSpawnVersion] = useState(0);
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

  const applyPendingRowDrop = useCallback(() => {
    pendingRowDropRef.current = false;
    setPendingRowDrop(false);
    dropSecondsLeftRef.current = WORD_WAVE_ROW_DROP_SECONDS;
    setDropSecondsLeft(WORD_WAVE_ROW_DROP_SECONDS);
    setHiddenTileIds(new Set());
    setBoard(currentBoard => {
      const nextBoard = applyWordWaveTimedRowDrop(currentBoard);
      newTileSpawnPositionsRef.current = getNewTileSpawnPositions(
        currentBoard,
        nextBoard,
      );
      return nextBoard;
    });
    setRowDrops(count => count + 1);
  }, []);

  const armPendingRowDrop = useCallback(() => {
    pendingRowDropRef.current = true;
    setPendingRowDrop(true);
    dropSecondsLeftRef.current = 0;
    setDropSecondsLeft(0);
    setPressureScore(score => score - WORD_WAVE_SIZE);
  }, []);

  useEffect(() => {
    isResolvingRef.current = isResolving;
  }, [isResolving]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isResolvingRef.current) {
        return;
      }

      if (pendingRowDropRef.current) {
        if (isDraggingRef.current) {
          setPressureScore(score => score - WORD_WAVE_PENDING_DROP_PENALTY);
          return;
        }

        applyPendingRowDrop();
        return;
      }

      const nextSeconds = dropSecondsLeftRef.current - 1;

      if (nextSeconds > 0) {
        dropSecondsLeftRef.current = nextSeconds;
        setDropSecondsLeft(nextSeconds);
        return;
      }

      if (isDraggingRef.current) {
        armPendingRowDrop();
        return;
      }

      applyPendingRowDrop();
      setPressureScore(score => score - WORD_WAVE_SIZE);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [applyPendingRowDrop, armPendingRowDrop]);

  useEffect(
    () => () => {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
      }
    },
    [],
  );

  const resolveWordSelection = () => {
    const move = getMoveForPath(board, selectionRef.current);

    if (!move || isResolving) {
      return;
    }

    isResolvingRef.current = true;
    setIsResolving(true);
    setHiddenTileIds(
      new Set(move.path.map(position => board[position.row][position.col].id)),
    );
    startPositionRef.current = null;
    selectionRef.current = [];
    setSelection([]);

    requestAnimationFrame(() => {
      resolveTimerRef.current = setTimeout(() => {
        const wordResult = applyWordWaveTimedSelectionFast(
          board,
          move.path,
          move.word.length,
        );

        newTileSpawnPositionsRef.current = getNewTileSpawnPositions(
          board,
          wordResult.board,
        );
        setBoard(wordResult.board);
        setHiddenTileIds(new Set());
        setPressureScore(score => score + wordResult.pressureScore);
        setArcadeScore(score => score + wordResult.arcadeScore);
        setWordsFound(count => count + 1);
        setLastRepairCount(wordResult.repairedCount);
        setHintIndex(0);
        isResolvingRef.current = false;
        setIsResolving(false);

        if (pendingRowDropRef.current) {
          requestAnimationFrame(applyPendingRowDrop);
        }
      }, 16);
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

    isDraggingRef.current = false;
    const move = getMoveForPath(board, selectionRef.current);

    if (move && !isResolving) {
      resolveWordSelection();
    } else {
      startPositionRef.current = null;
      selectionRef.current = [];
      setSelection([]);

      if (pendingRowDropRef.current) {
        applyPendingRowDrop();
      }
    }
  };

  const handleSpawnConsumed = useCallback((tileId: string) => {
    if (!newTileSpawnPositionsRef.current.has(tileId)) {
      return;
    }

    const nextSpawnPositions = new Map(newTileSpawnPositionsRef.current);
    nextSpawnPositions.delete(tileId);
    newTileSpawnPositionsRef.current = nextSpawnPositions;
    setSpawnVersion(version => version + 1);
  }, []);

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
            <Text style={styles.statValue}>
              {pendingRowDrop ? 'DROP' : dropSecondsLeft}
            </Text>
            <Text style={styles.statLabel}>Drop</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pressureScore}</Text>
            <Text style={styles.statLabel}>Wave</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{arcadeScore}</Text>
            <Text style={styles.statLabel}>Score</Text>
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

            isDraggingRef.current = Boolean(position);
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
              const hidden = hiddenTileIds.has(tile.id);

              return (
                <Tile
                  key={tile.id}
                  tile={tile}
                  row={row}
                  col={col}
                  cellSize={cellSize}
                  selected={selected}
                  valid={selected && Boolean(selectedMove)}
                  hidden={hidden}
                  spawnState={newTileSpawnPositionsRef.current.get(tile.id)}
                  onSpawnConsumed={handleSpawnConsumed}
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
              selectedMove && !isResolving && resolveWordSelection()
            }
            style={({pressed}) => [
              styles.clearButton,
              (!selectedMove || isResolving) && styles.clearButtonDisabled,
              pressed && selectedMove && styles.clearButtonPressed,
            ]}>
            <Text style={styles.clearButtonText}>
              {isResolving ? '...' : 'Found'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.miniStatsRow}>
          <Text style={styles.injectedText}>Words {wordsFound}</Text>
          <Text style={styles.injectedText}>Rows {rowDrops}</Text>
          <Text style={styles.injectedText}>Repair {lastRepairCount}</Text>
          <Text style={styles.injectedText}>Options {visibleWords.length}</Text>
        </View>

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
  tileHidden: {
    opacity: 0,
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  miniStatsRow: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
