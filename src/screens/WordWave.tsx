import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import NavigationBar from '~/components/NavigationBar';
import WordWaveSelectionLine from '~/components/WordWaveSelectionLine';
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
import {Banner} from '~/components/AdBanner';
import {runOnJS} from 'react-native-worklets';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

type WordWaveProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WordWave'>;
};

type TileProps = {
  tile: WordWaveTile;
  row: number;
  col: number;
  cellSize: number;
  selected: boolean;
  hidden: boolean;
  spawnState?: WordWaveTileSpawnState;
  onSpawnConsumed: (tileId: string) => void;
};

type WordWaveTileSpawnState = {
  startPosition: WordWavePosition;
  delayMs: number;
};

type WordWaveFoundWord = {
  id: string;
  word: string;
  wave: number;
  score: number;
};

type WordWaveRunState = 'ready' | 'playing' | 'ended';

const WORD_WAVE_ROW_DROP_SECONDS = 10;
const WORD_WAVE_TOTAL_WAVES = 10;
const tileSpringConfig = {
  mass: 0.35,
  damping: 14,
  stiffness: 120,
};
const TILE_SPAWN_COLUMN_DELAY_MS = 16;
const TILE_SPAWN_STACK_DELAY_MS = 42;
const WORD_WAVE_DROP_INPUT_GRACE_MS = 120;
const WORD_WAVE_PENDING_DROP_PENALTY = 2;
const READY_STEPS = ['Ready', 'Set', 'Go!'];

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
  hidden,
  spawnState,
  onSpawnConsumed,
}) => {
  const startPosition = spawnState?.startPosition;
  const consumedSpawnIdRef = useRef<string | null>(null);
  const spawnFrameRef = useRef<number | null>(null);
  const translateX = useSharedValue((startPosition?.col ?? col) * cellSize);
  const translateY = useSharedValue((startPosition?.row ?? row) * cellSize);
  const letterTranslateX = useSharedValue(0);
  const letterOpacity = useSharedValue(1);
  const selectionScale = useSharedValue(1);
  const tileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}, {translateY: translateY.value}],
  }));
  const letterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: letterOpacity.value,
    transform: [{translateX: letterTranslateX.value}],
  }));
  const selectionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: selectionScale.value}],
  }));

  useEffect(() => {
    selectionScale.value = withSpring(selected ? 1.05 : 1, {
      mass: 0.3,
      damping: 13,
      stiffness: 260,
    });
  }, [selected, selectionScale]);

  useEffect(() => {
    const targetX = col * cellSize;
    const targetY = row * cellSize;

    if (spawnFrameRef.current !== null) {
      cancelAnimationFrame(spawnFrameRef.current);
      spawnFrameRef.current = null;
    }

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

    spawnFrameRef.current = requestAnimationFrame(() => {
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
    });

    return () => {
      if (spawnFrameRef.current !== null) {
        cancelAnimationFrame(spawnFrameRef.current);
        spawnFrameRef.current = null;
      }
    };
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
          hidden && styles.tileHidden,
          selectionAnimatedStyle,
        ]}>
        <LinearGradient
          style={styles.tileFill}
          colors={['#F7EEFB', '#FBF6FD', '#F6EFFB']}
        />
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
  const [runState, setRunState] = useState<WordWaveRunState>('ready');
  const [readyStepIndex, setReadyStepIndex] = useState(0);
  const [arcadeScore, setArcadeScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);
  const [foundWords, setFoundWords] = useState<WordWaveFoundWord[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [hiddenTileIds, setHiddenTileIds] = useState<Set<string>>(new Set());
  const [pendingRowDrop, setPendingRowDrop] = useState(false);
  const runStateRef = useRef<WordWaveRunState>('ready');
  const currentWaveRef = useRef(1);
  const isResolvingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pendingRowDropRef = useRef(false);
  const dropSecondsLeftRef = useRef(WORD_WAVE_ROW_DROP_SECONDS);
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const selectionRef = useRef<WordWavePosition[]>([]);
  const startPositionRef = useRef<WordWavePosition | null>(null);
  const newTileSpawnPositionsRef = useRef<Map<string, WordWaveTileSpawnState>>(
    new Map(),
  );
  const [, setSpawnVersion] = useState(0);
  const {width, height} = useWindowDimensions();
  const boardSize = Math.min(width - 20, height * 0.52, 440);
  const cellSize = boardSize / WORD_WAVE_SIZE;
  const readyScale = useSharedValue(0.82);
  const readyOpacity = useSharedValue(0);
  const readyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: readyOpacity.value,
    transform: [{scale: readyScale.value}],
  }));

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
        if (move.word.length < 4 || move.word.length > 6) {
          return false;
        }

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
      )
      .slice(0, 12);
  }, [moves]);
  const renderedTiles = useMemo(
    () =>
      board.flatMap((rowTiles, row) =>
        rowTiles.map((tile, col) => ({tile, row, col})),
      ),
    [board],
  );
  const wordsByWave = useMemo(
    () =>
      Array.from({length: WORD_WAVE_TOTAL_WAVES}, (_, index) => {
        const wave = index + 1;
        const words = foundWords.filter(item => item.wave === wave);

        return {
          wave,
          words,
          score: words.reduce((sum, item) => sum + item.score, 0),
        };
      }),
    [foundWords],
  );

  useEffect(() => {
    if (runState !== 'ready') {
      readyOpacity.value = withTiming(0, {duration: 120});
      return;
    }

    readyScale.value = 0.82;
    readyOpacity.value = 1;
    readyScale.value = withSpring(1.18, {
      mass: 0.35,
      damping: 8,
      stiffness: 110,
    });
  }, [readyOpacity, readyScale, readyStepIndex, runState]);

  const endRun = useCallback(() => {
    runStateRef.current = 'ended';
    setRunState('ended');
    pendingRowDropRef.current = false;
    setPendingRowDrop(false);
    isDraggingRef.current = false;
    startPositionRef.current = null;
    selectionRef.current = [];
    setSelection([]);
  }, []);

  const resetRun = useCallback(() => {
    const nextBoard = createWordWaveBoard();

    runStateRef.current = 'ready';
    currentWaveRef.current = 1;
    pendingRowDropRef.current = false;
    isDraggingRef.current = false;
    isResolvingRef.current = false;
    dropSecondsLeftRef.current = WORD_WAVE_ROW_DROP_SECONDS;
    startPositionRef.current = null;
    selectionRef.current = [];
    newTileSpawnPositionsRef.current = new Map();

    setBoard(nextBoard);
    setSelection([]);
    setDropSecondsLeft(WORD_WAVE_ROW_DROP_SECONDS);
    setRunState('ready');
    setReadyStepIndex(0);
    setArcadeScore(0);
    setWordsFound(0);
    setCurrentWave(1);
    setFoundWords([]);
    setHintIndex(0);
    setIsResolving(false);
    setHiddenTileIds(new Set());
    setPendingRowDrop(false);
  }, []);

  const applyPendingRowDrop = useCallback(() => {
    if (pendingDropTimerRef.current) {
      clearTimeout(pendingDropTimerRef.current);
      pendingDropTimerRef.current = null;
    }

    if (currentWaveRef.current >= WORD_WAVE_TOTAL_WAVES) {
      endRun();
      return;
    }

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
    currentWaveRef.current += 1;
    setCurrentWave(currentWaveRef.current);
  }, [endRun]);

  const armPendingRowDrop = useCallback(() => {
    if (pendingRowDropRef.current) {
      return;
    }

    pendingRowDropRef.current = true;
    setPendingRowDrop(true);
    dropSecondsLeftRef.current = 0;
    setDropSecondsLeft(0);
  }, []);

  const applyPendingRowDropAfterInputGrace = useCallback(() => {
    if (pendingDropTimerRef.current) {
      clearTimeout(pendingDropTimerRef.current);
    }

    pendingDropTimerRef.current = setTimeout(() => {
      pendingDropTimerRef.current = null;

      if (
        pendingRowDropRef.current &&
        !isDraggingRef.current &&
        !isResolvingRef.current
      ) {
        applyPendingRowDrop();
      }
    }, WORD_WAVE_DROP_INPUT_GRACE_MS);
  }, [applyPendingRowDrop]);

  useEffect(() => {
    isResolvingRef.current = isResolving;
  }, [isResolving]);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  useEffect(() => {
    currentWaveRef.current = currentWave;
  }, [currentWave]);

  useEffect(() => {
    if (runState !== 'ready') {
      return;
    }

    const readyTimer = setInterval(() => {
      setReadyStepIndex(index => {
        if (index >= READY_STEPS.length - 1) {
          clearInterval(readyTimer);
          runStateRef.current = 'playing';
          setRunState('playing');
          return index;
        }

        return index + 1;
      });
    }, 700);

    return () => {
      clearInterval(readyTimer);
    };
  }, [runState]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (runStateRef.current !== 'playing' || isResolvingRef.current) {
        return;
      }

      if (pendingRowDropRef.current) {
        if (isDraggingRef.current) {
          setArcadeScore(score =>
            Math.max(0, score - WORD_WAVE_PENDING_DROP_PENALTY),
          );
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

      armPendingRowDrop();
      applyPendingRowDropAfterInputGrace();
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    applyPendingRowDrop,
    applyPendingRowDropAfterInputGrace,
    armPendingRowDrop,
  ]);

  useEffect(
    () => () => {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
      }
      if (pendingDropTimerRef.current) {
        clearTimeout(pendingDropTimerRef.current);
      }
    },
    [],
  );

  const resolveWordSelection = () => {
    const move = getMoveForPath(board, selectionRef.current);

    if (!move || isResolving || runStateRef.current !== 'playing') {
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
        setArcadeScore(score => score + wordResult.arcadeScore);
        setWordsFound(count => count + 1);
        setHintIndex(0);
        setFoundWords(words => [
          ...words,
          {
            id: `${Date.now()}:${move.word}:${words.length}`,
            word: move.word,
            wave: currentWaveRef.current,
            score: wordResult.arcadeScore,
          },
        ]);
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
    if (isResolving || runStateRef.current !== 'playing') {
      return;
    }

    const position = getPositionFromTouch(event);
    const startPosition = startPositionRef.current;

    if (position && startPosition) {
      setSelectionPath(getWordWaveSelectionPath(startPosition, position));
    }
  };

  const handleSelectionRelease = () => {
    isDraggingRef.current = false;

    if (isResolving || runStateRef.current !== 'playing') {
      return;
    }

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

  const hasWord = selectedWord.length > 0;

  return (
    <View style={styles.container}>
      <NavigationBar title="Word Wave" onBack={() => navigation.goBack()} />
      <LinearGradient
        colors={['#4B21A6', '#8043E9', '#9f4ef1', '#4B21A6']}
        style={styles.content}>
        <View style={styles.headerWrapper}>
          <AnimatedLinearGradient
            key={hasWord ? 'word-header' : 'info-header'}
            style={[
              styles.headerPill,
              hasWord ? styles.wordPill : styles.infoPill,
            ]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            colors={
              hasWord
                ? ['#8925b453', '#953be396', '#8925b453']
                : ['#8c3be396', '#4925b400', '#4925b400']
            }
            entering={FadeIn.duration(120)}
            exiting={FadeOut.duration(90)}
            layout={LinearTransition.springify()
              .mass(0.3)
              .damping(12)
              .stiffness(100)}>
            {hasWord ? (
              <View style={styles.wordContainer}>
                <Text style={styles.wordText}>{selectedWord}</Text>
              </View>
            ) : (
              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <Text
                    style={[
                      styles.badgeValue,
                      pendingRowDrop && styles.badgeValueAlert,
                    ]}>
                    {pendingRowDrop ? 'DROP' : dropSecondsLeft}
                  </Text>
                  <Text style={styles.badgeLabel}>Drop In</Text>
                </View>
                <View style={styles.badgeSeparator} />
                <View style={styles.badge}>
                  <Text style={styles.badgeValue}>{arcadeScore}</Text>
                  <Text style={styles.badgeLabel}>Score</Text>
                </View>
                <View style={styles.badgeSeparator} />
                <View style={styles.badge}>
                  <Text style={styles.badgeValue}>
                    {currentWave}/{WORD_WAVE_TOTAL_WAVES}
                  </Text>
                  <Text style={styles.badgeLabel}>Wave</Text>
                </View>
              </View>
            )}
          </AnimatedLinearGradient>
        </View>

        <View style={styles.boardArea}>
          <View
            style={[
              styles.boardShadowContainer,
              {width: boardSize, height: boardSize},
            ]}>
            <View style={styles.gridFrame} />
            <View
              onStartShouldSetResponder={() => {
                if (
                  isResolvingRef.current ||
                  runStateRef.current !== 'playing'
                ) {
                  return false;
                }

                isDraggingRef.current = true;
                return true;
              }}
              onMoveShouldSetResponder={() => true}
              onTouchStart={() => {
                if (
                  !isResolvingRef.current &&
                  runStateRef.current === 'playing'
                ) {
                  isDraggingRef.current = true;
                }
              }}
              onResponderGrant={event => {
                if (isResolving || runStateRef.current !== 'playing') {
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
              style={styles.gridContainer}>
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
                    hidden={hidden}
                    spawnState={newTileSpawnPositionsRef.current.get(tile.id)}
                    onSpawnConsumed={handleSpawnConsumed}
                  />
                );
              })}
              <WordWaveSelectionLine
                selection={selection}
                cellSize={cellSize}
                valid={Boolean(selectedMove)}
              />
            </View>
          </View>
        </View>

        <View style={styles.wordsPanel}>
          <View style={styles.wordsHeader}>
            <Text style={styles.panelLabel}>Words To Reveal</Text>
            <Pressable
              disabled={visibleWords.length === 0}
              onPress={highlightNextMove}
              style={({pressed}) => [
                styles.hintButton,
                visibleWords.length === 0 && styles.hintButtonDisabled,
                pressed && styles.clearButtonPressed,
              ]}>
              <Text style={styles.hintButtonText}>Highlight</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.wordsWrap}
            showsVerticalScrollIndicator={false}>
            {visibleWords.length === 0 ? (
              <Text style={styles.wordsEmpty}>No words available</Text>
            ) : (
              visibleWords.map(move => (
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
              ))
            )}
          </ScrollView>
        </View>
        {runState === 'ready' && (
          <Animated.View
            pointerEvents="none"
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.readyOverlay}>
            <Animated.View style={[styles.readyGrid, readyAnimatedStyle]}>
              <Text style={styles.readyText}>
                {READY_STEPS[readyStepIndex]}
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </LinearGradient>

      <Modal
        visible={runState === 'ended'}
        transparent
        animationType="fade"
        onRequestClose={resetRun}>
        <View style={styles.summaryBackdrop}>
          <View style={styles.summaryDialog}>
            <Text style={styles.summaryTitle}>Run Complete</Text>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{arcadeScore}</Text>
                <Text style={styles.summaryLabel}>Score</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{wordsFound}</Text>
                <Text style={styles.summaryLabel}>Words</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {foundWords.reduce(
                    (longest, item) => Math.max(longest, item.word.length),
                    0,
                  )}
                </Text>
                <Text style={styles.summaryLabel}>Best</Text>
              </View>
            </View>
            <FlatList
              data={wordsByWave}
              keyExtractor={item => `wave-${item.wave}`}
              style={styles.summaryList}
              contentContainerStyle={styles.summaryListContent}
              renderItem={({item}) => (
                <View style={styles.waveSummaryRow}>
                  <View style={styles.waveSummaryHeader}>
                    <Text style={styles.waveSummaryTitle}>
                      Wave {item.wave}
                    </Text>
                    <Text style={styles.waveSummaryScore}>{item.score}</Text>
                  </View>
                  <Text style={styles.waveSummaryWords}>
                    {item.words.length > 0
                      ? item.words.map(word => word.word).join(', ')
                      : '-'}
                  </Text>
                </View>
              )}
            />
            <View style={styles.summaryActions}>
              <Pressable
                onPress={resetRun}
                style={({pressed}) => [
                  styles.summaryButton,
                  pressed && styles.clearButtonPressed,
                ]}>
                <Text style={styles.summaryButtonText}>Play Again</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({pressed}) => [
                  styles.summaryButton,
                  styles.summaryButtonSecondary,
                  pressed && styles.clearButtonPressed,
                ]}>
                <Text style={styles.summaryButtonText}>Home</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4B21A6',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerWrapper: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#9d46e9bc',
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerPill: {
    padding: 6,
    minHeight: 60,
    justifyContent: 'center',
  },
  infoPill: {
    backgroundColor: '#ba52ff31',
  },
  wordPill: {},
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  badge: {
    flex: 1,
    alignItems: 'center',
  },
  badgeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  badgeValueAlert: {
    color: '#FFD86A',
  },
  badgeLabel: {
    color: '#E6D8FB',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  badgeSeparator: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  wordText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  boardArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  boardShadowContainer: {
    position: 'relative',
  },
  gridFrame: {
    ...StyleSheet.absoluteFill,
    margin: -7,
    backgroundColor: '#DECCF8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B99DEF',
    shadowColor: '#2D126D',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 8,
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#d4c4ea',
    borderColor: '#cdb8eb',
    shadowColor: '#410747',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 10,
    elevation: 5,
  },
  tileWrap: {
    position: 'absolute',
    padding: 1.5,
  },
  tile: {
    flex: 1,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F1F9',
    borderTopWidth: 2,
    borderBottomWidth: 1,
    borderTopColor: '#FBF8FE',
    borderBottomColor: '#EEE3F9',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#FBF8FE',
    borderRightColor: '#EEE3F9',
  },
  tileFill: {
    ...StyleSheet.absoluteFill,
  },
  tileHidden: {
    opacity: 0,
  },
  tileLetter: {
    color: '#3a1e74',
    fontSize: 28,
    fontWeight: '800',
  },
  clearButtonPressed: {
    opacity: 0.86,
    transform: [{scale: 0.98}],
  },
  wordsPanel: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    minHeight: 96,
    marginTop: 12,
    marginBottom: Banner.height - 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 12,
  },
  wordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  panelLabel: {
    color: '#E6D8FB',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintButton: {
    borderRadius: 14,
    backgroundColor: '#A44DF6',
    borderWidth: 2,
    borderColor: '#B96EFA',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  hintButtonDisabled: {
    opacity: 0.35,
  },
  hintButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  wordsEmpty: {
    color: '#E6D8FB',
    fontSize: 13,
    fontWeight: '700',
    paddingTop: 12,
  },
  wordChip: {
    borderRadius: 12,
    backgroundColor: '#F7F1F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  wordChipSelected: {
    backgroundColor: '#C7F5DD',
  },
  wordChipPressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  wordChipText: {
    color: '#3a1e74',
    fontSize: 14,
    fontWeight: '900',
  },
  readyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(58,30,116,0.2)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyGrid: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    bottom: 100 + Banner.height,
  },
  readyText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: 'rgba(58,30,116,0.55)',
    textShadowOffset: {width: 0, height: 4},
    textShadowRadius: 10,
    overflow: 'visible',
    padding: 10,
  },
  summaryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32,12,74,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  summaryDialog: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '82%',
    borderRadius: 8,
    backgroundColor: '#F8F1FF',
    padding: 16,
  },
  summaryTitle: {
    color: '#3a1e74',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  summaryStat: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#E9DAFB',
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#3a1e74',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#6A4AA4',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryList: {
    marginTop: 12,
  },
  summaryListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  waveSummaryRow: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  waveSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveSummaryTitle: {
    color: '#3a1e74',
    fontSize: 13,
    fontWeight: '900',
  },
  waveSummaryScore: {
    color: '#6F54FB',
    fontSize: 13,
    fontWeight: '900',
  },
  waveSummaryWords: {
    color: '#543B82',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  summaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#6F54FB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryButtonSecondary: {
    backgroundColor: '#9D7ED7',
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default WordWave;
