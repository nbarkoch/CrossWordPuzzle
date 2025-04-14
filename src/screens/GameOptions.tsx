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

const {width} = Dimensions.get('window');
const ITEM_SPACING = 10;
const ITEMS_PER_ROW = 3;
const ITEM_WIDTH =
  (width - 40 - ITEM_SPACING * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

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
        scale: withSpring(isSelected ? 1.1 : 1, {
          mass: 0.5,
          damping: 12,
          stiffness: 90,
        }),
      },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={[styles.categoryContainer, animatedStyle]}>
      <LinearGradient
        colors={
          isSelected
            ? ['#e77cff', '#d93cfc']
            : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
        }
        style={styles.categoryGradient}>
        <TouchableOpacity onPress={onSelect} style={styles.categoryButton}>
          <Text style={styles.categoryEmoji}>{CATEGORIES_ICONS[category]}</Text>
          <Text style={styles.categoryText}>{category}</Text>
        </TouchableOpacity>
      </LinearGradient>
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

  function onStart(params: {
    category: CategorySelection;
    blockSize: GridSize;
  }): void {
    navigation.navigate('Game', {...params, mode});
  }

  return (
    <LinearGradient colors={['#994CFD', '#6F54FB']} style={styles.container}>
      <NavigationBar title="Word Search" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose a category and puzzle size</Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
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

        <View style={styles.bottomContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
            style={styles.sizesContainer}>
            <Text style={styles.sectionTitle}>Puzzle Size</Text>
            <View style={styles.sizesGrid}>
              {GRID_TYPE_SIZES.map(size => {
                const {rows, cols} = GRID_SIZES[size];
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeButton,
                      selectedSize === size && styles.selectedSizeButton,
                    ]}
                    onPress={() => setSelectedSize(size)}>
                    <LinearGradient
                      colors={
                        selectedSize === size
                          ? ['#e77cff', '#d93cfc']
                          : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
                      }
                      style={styles.sizeButtonGradient}>
                      <Text style={styles.sizeName}>{size}</Text>
                      <Text style={styles.sizeDescription}>
                        {cols}x{rows} grid
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={[
              styles.playButton,
              (!selectedCategory || !selectedSize) && styles.playButtonDisabled,
            ]}
            disabled={!selectedCategory || !selectedSize}
            onPress={() =>
              selectedCategory &&
              selectedSize &&
              onStart({category: selectedCategory, blockSize: selectedSize})
            }>
            <LinearGradient
              colors={
                selectedCategory && selectedSize
                  ? ['#e77cff', '#d93cfc']
                  : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
              }
              style={styles.playButtonGradient}>
              <Text style={styles.playButtonText}>Play Game</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryContainer: {
    width: ITEM_WIDTH,
    marginBottom: ITEM_SPACING,
    overflow: 'visible',
  },
  categoryGradient: {
    borderRadius: 12,
    padding: 1,
  },
  categoryButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  bottomContainer: {
    gap: 16,
    padding: 20,
    paddingBottom: Banner.height + 30,
  },
  sizesContainer: {
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  sizesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sizeButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sizeButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  selectedSizeButton: {
    transform: [{scale: 1.05}],
  },
  sizeName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  sizeDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  playButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
});

export default GameOptions;
