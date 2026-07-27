import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {RootStackParamList} from './Navigation';
import NavigationBar from '~/components/NavigationBar';
import {GRID_SIZES} from '~/utils/blockCalcs';
import {
  CATEGORIES,
  CategorySelection,
  GRID_TYPE_SIZES,
  GridSize,
} from '~/utils/types';
import {Banner} from '~/components/AdBanner';
import {CATEGORIES_ICONS} from '~/utils/consts';
import {RouteProp, useRoute} from '@react-navigation/native';
import {prepareGrid} from '~/utils/gridGenerationCache';
import DialogButton from '~/components/dialogs/DialogButton';
import GradientSurface, {
  GRADIENT_VARIANTS,
} from '~/components/dialogs/GradientSurface';
import SmallStar from '~/components/decorations/star';

const {width} = Dimensions.get('window');
const ITEM_SPACING = 15;
const ITEMS_PER_ROW = 3;
const ITEM_WIDTH =
  (width - 40 - 48 - ITEM_SPACING * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

const SectionHeader = ({title}: {title: string}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const Decoration = () => (
  <View style={styles.divider}>
    <LinearGradient
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      colors={['#F6EEFD', '#D9BCFC']}
      style={styles.dividerLine}
    />
    <SmallStar size={12} color="#D9BCFC" />
    <LinearGradient
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      colors={['#D9BCFC', '#F6EEFD']}
      style={styles.dividerLine}
    />
  </View>
);

const CategoryItem = ({
  category,
  index,
  isSelected,
  onSelect,
}: {
  category: CategorySelection;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isSelected ? 1.06 : 1, {
          mass: 0.5,
          damping: 12,
          stiffness: 90,
        }),
      },
    ],
  }));

  const variant = isSelected ? 'primary' : 'third';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)}
      style={[styles.categoryContainer, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSelect}
        style={[
          styles.cardShadow,
          isSelected ? styles.cardShadowSelected : styles.cardShadowIdle,
        ]}>
        <GradientSurface
          variant={variant}
          radius={14}
          contentStyle={styles.categoryFace}>
          <Text style={styles.categoryEmoji}>{CATEGORIES_ICONS[category]}</Text>
          <Text
            style={[
              styles.categoryText,
              {color: GRADIENT_VARIANTS[variant].textColor},
            ]}>
            {category}
          </Text>
        </GradientSurface>
      </TouchableOpacity>
    </Animated.View>
  );
};

type GameOptionsProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameOptions'>;
};

const GameOptions: React.FC<GameOptionsProps> = ({navigation}) => {
  const {mode} =
    useRoute<RouteProp<RootStackParamList, 'GameOptions'>>().params;

  const [selectedCategory, setSelectedCategory] =
    useState<CategorySelection | null>(null);
  const [selectedSize, setSelectedSize] = useState<GridSize | null>(null);

  React.useEffect(() => {
    if (selectedCategory && selectedSize) {
      prepareGrid({category: selectedCategory, gridSize: selectedSize, mode});
    }
  }, [mode, selectedCategory, selectedSize]);

  function onStart(params: {
    category: CategorySelection;
    blockSize: GridSize;
  }): void {
    navigation.navigate('Game', {...params, mode});
  }

  const canPlay = Boolean(selectedCategory && selectedSize);

  return (
    <LinearGradient colors={['#4B21A6', '#8043E9']} style={styles.container}>
      <NavigationBar title="New Game" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <LinearGradient
          colors={['#A273F9', '#9559F7']}
          style={styles.cardBorder}>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <SmallStar size={16} color="#B98BF5" />
              <Text style={styles.title}>Choose Your Puzzle</Text>
              <SmallStar size={16} color="#B98BF5" />
            </View>

            <View style={styles.scrollViewW}>
              <Decoration />
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                <SectionHeader title="Category" />
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((category, index) => (
                    <CategoryItem
                      key={category}
                      category={category}
                      index={index}
                      isSelected={selectedCategory === category}
                      onSelect={() => setSelectedCategory(category)}
                    />
                  ))}
                </View>
              </ScrollView>

              <View style={styles.playRow}>
                <SectionHeader title="Puzzle Size" />

                <View style={styles.sizesGrid}>
                  {GRID_TYPE_SIZES.map(size => {
                    const {rows, cols} = GRID_SIZES[size];
                    const isSelected = selectedSize === size;
                    const variant = isSelected ? 'primary' : 'secondary';
                    return (
                      <TouchableOpacity
                        key={size}
                        activeOpacity={0.85}
                        style={[
                          styles.sizeButton,
                          styles.cardShadow,
                          isSelected
                            ? styles.cardShadowSelected
                            : styles.cardShadowIdle,
                        ]}
                        onPress={() => setSelectedSize(size)}>
                        <GradientSurface
                          variant={variant}
                          radius={14}
                          contentStyle={styles.sizeFace}>
                          <Text
                            style={[
                              styles.sizeName,
                              {color: GRADIENT_VARIANTS[variant].textColor},
                            ]}>
                            {size}
                          </Text>
                          <Text
                            style={[
                              styles.sizeDescription,
                              isSelected
                                ? styles.sizeDescriptionSelected
                                : styles.sizeDescriptionIdle,
                            ]}>
                            {cols}x{rows}
                          </Text>
                        </GradientSurface>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Decoration />
                <DialogButton
                  type="primary"
                  text="Play Game"
                  fullWidth
                  disabled={!canPlay}
                  onPress={() =>
                    selectedCategory &&
                    selectedSize &&
                    onStart({
                      category: selectedCategory,
                      blockSize: selectedSize,
                    })
                  }
                />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: Banner.height + 20,
  },
  cardBorder: {
    flex: 1,
    borderRadius: 30,
    padding: 5,
    borderWidth: 1,
    borderColor: '#5d25a296',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 8,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#F6EEFD',
    paddingTop: 20,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2F1172',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 30,
  },
  dividerLine: {
    height: 1,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7946ED',
  },
  badgeDots: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FBFAFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#331378',
  },
  scrollViewW: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ITEM_SPACING,
  },
  categoryContainer: {
    width: ITEM_WIDTH,
  },
  cardShadow: {
    borderRadius: 16,
    shadowOffset: {width: 0, height: 3},
  },
  cardShadowIdle: {
    shadowColor: '#7445E1',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  cardShadowSelected: {
    shadowColor: '#C026D3',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 5,
  },
  categoryFace: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  sizesSpacing: {
    marginTop: 20,
  },
  sizesGrid: {
    flexDirection: 'row',
    gap: ITEM_SPACING,
  },
  sizeButton: {
    flex: 1,
  },
  sizeFace: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  sizeName: {
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sizeDescription: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sizeDescriptionIdle: {
    color: '#6E45D0a0',
  },
  sizeDescriptionSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  playRow: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 15,
    gap: 15,
    borderTopWidth: 1,
    borderColor: '#b98bf55a',
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
});

export default GameOptions;
