import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from './Navigation';
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
import {GRADIENT_VARIANTS} from '~/components/dialogs/GradientSurface';
import SelectableCard from '~/components/SelectableCard';
import SmallStar from '~/components/decorations/star';
import {ArrowLeft} from '~/components/decorations/arrows';
import LineDecoration from '~/components/decorations/lineDecoration';

const {width} = Dimensions.get('window');
const ITEM_SPACING = 12;
const ITEMS_PER_ROW = 3;
// Horizontal chrome per side: screen padding (16) + card border (5+1) + list
// padding (18) = 40. Keep this in sync with the styles below.
const SIDE_INSET = 40;
const ITEM_WIDTH =
  (width - SIDE_INSET * 2 - ITEM_SPACING * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

// Visual dot-matrix dimension per puzzle tier — denser grids read as "bigger".
const PREVIEW_DIMS: Record<GridSize, [number, number]> = {
  small: [3, 3],
  medium: [4, 3],
  large: [4, 4],
};

const SectionHeader = ({title}: {title: string}) => (
  <View style={styles.sectionHeader}>
    <SmallStar size={12} color="#C6A4F2" />
    <Text style={styles.sectionTitle}>{title}</Text>
    <SmallStar size={12} color="#C6A4F2" />
  </View>
);

const GridPreview = ({dim, color}: {dim: [number, number]; color: string}) => (
  <View style={styles.gridPreview}>
    {Array.from({length: dim[0]}).map((_row, r) => (
      <View key={r} style={styles.gridPreviewRow}>
        {Array.from({length: dim[1]}).map((_col, c) => (
          <View
            key={c}
            style={[styles.gridPreviewDot, {backgroundColor: color}]}
          />
        ))}
      </View>
    ))}
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
}) => (
  <SelectableCard
    isSelected={isSelected}
    onPress={onSelect}
    index={index}
    containerStyle={styles.categoryContainer}
    contentStyle={styles.categoryFace}>
    {variant => (
      <>
        <Text style={styles.categoryEmoji}>{CATEGORIES_ICONS[category]}</Text>
        <Text
          style={[
            styles.categoryText,
            {color: GRADIENT_VARIANTS[variant].textColor},
          ]}>
          {category}
        </Text>
      </>
    )}
  </SelectableCard>
);

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
    <LinearGradient colors={['#4B21A6', '#7E43E4']} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({pressed}) => [
            styles.backButton,
            {transform: [{scale: pressed ? 0.95 : 1}]},
          ]}>
          <ArrowLeft size={30} stroke="white" />
        </Pressable>

        <View style={styles.titleBlock}>
          <View style={styles.titleStarLeft}>
            <SmallStar size={14} color="#FFFFFF" />
          </View>
          <View style={styles.titleStarRight}>
            <SmallStar size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.titleNew}>NEW GAME</Text>
        </View>

        <View style={styles.blankCube} />
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={['#A273F9', '#9559F7']}
          style={styles.cardBorder}>
          <View style={styles.card}>
            <SectionHeader title="Choose Category" />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
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

            <View style={styles.bottomSection}>
              <SectionHeader title="Choose Puzzle Size" />

              <View style={styles.sizesGrid}>
                {GRID_TYPE_SIZES.map(size => {
                  const {rows, cols} = GRID_SIZES[size];
                  const isSelected = selectedSize === size;
                  return (
                    <SelectableCard
                      key={size}
                      isSelected={isSelected}
                      onPress={() => setSelectedSize(size)}
                      containerStyle={styles.sizeButton}
                      contentStyle={styles.sizeFace}>
                      {variant => (
                        <>
                          <GridPreview
                            dim={PREVIEW_DIMS[size]}
                            color={isSelected ? '#FFFFFF' : '#825BE2'}
                          />
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
                        </>
                      )}
                    </SelectableCard>
                  );
                })}
              </View>

              <View>
                <LineDecoration />
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    paddingLeft: 5,
    aspectRatio: 1,
    borderRadius: 50,
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  titleBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  titleStarLeft: {
    position: 'absolute',
    left: -34,
    top: 2,
    opacity: 0.9,
  },
  titleStarRight: {
    position: 'absolute',
    right: -30,
    top: 12,
    opacity: 0.8,
  },
  titleNew: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(46,17,114,0.6)',
    textShadowOffset: {width: 0, height: 3},
    textShadowRadius: 4,
  },
  blankCube: {height: 50, width: 50},
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
    overflow: 'hidden',
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4B2491',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ITEM_SPACING,
  },
  categoryContainer: {
    width: ITEM_WIDTH,
  },
  categoryFace: {
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  categoryEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  bottomSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderColor: '#E4D3FA',
    backgroundColor: '#F0E4FD',
  },
  sizesGrid: {
    flexDirection: 'row',
    gap: ITEM_SPACING,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sizeButton: {
    flex: 1,
  },
  sizeFace: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    gap: 8,
  },
  gridPreview: {
    gap: 3,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gridPreviewRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gridPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 1.5,
  },
  sizeName: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sizeDescription: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -2,
  },
  sizeDescriptionIdle: {
    color: '#9873DE',
  },
  sizeDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
});

export default GameOptions;
