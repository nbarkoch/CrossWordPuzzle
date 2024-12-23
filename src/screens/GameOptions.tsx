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
import NavigationBar from '../components/NavigationBar';

const {width} = Dimensions.get('window');
const ITEM_SPACING = 10;
const ITEMS_PER_ROW = 3;
const ITEM_WIDTH =
  (width - 40 - ITEM_SPACING * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

const CATEGORIES = [
  {id: 'animals', name: 'Animals', emoji: '🦁'},
  {id: 'countries', name: 'Countries', emoji: '🌍'},
  {id: 'food', name: 'Food', emoji: '🍕'},
  {id: 'sports', name: 'Sports', emoji: '⚽'},
  {id: 'movies', name: 'Movies', emoji: '🎬'},
  {id: 'music', name: 'Music', emoji: '🎵'},
  {id: 'science', name: 'Science', emoji: '🔬'},
  {id: 'tech', name: 'Technology', emoji: '💻'},
  {id: 'nature', name: 'Nature', emoji: '🌿'},
];

const SIZES = [
  {id: 'small', name: 'Small', description: '6x8 grid'},
  {id: 'medium', name: 'Medium', description: '8x10 grid'},
  {id: 'large', name: 'Large', description: '10x12 grid'},
];

const CategoryItem = ({
  category,
  index,
  isSelected,
  onSelect,
}: {
  category: (typeof CATEGORIES)[0];
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isSelected ? 1.1 : 1, {
            mass: 0.5,
            damping: 12,
            stiffness: 90,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={[styles.categoryContainer, animatedStyle]}>
      <LinearGradient
        colors={
          isSelected
            ? ['#e77cff', '#d93cfc'] // Brighter gradient when selected
            : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
        }
        style={styles.categoryGradient}>
        <TouchableOpacity onPress={onSelect} style={[styles.categoryButton]}>
          <Animated.Text style={[styles.categoryEmoji, animatedStyle]}>
            {category.emoji}
          </Animated.Text>
          <Text style={[styles.categoryText]}>{category.name}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

type GameOptionsProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameOptions'>;
};
const GameOptions: React.FC<GameOptionsProps> = ({navigation}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  function onStart(params: {category: string; size: string}): void {
    navigation.navigate('Game', params);
  }

  return (
    <LinearGradient
      colors={['#994CFD', '#6F54FB']}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}>
      {' '}
      <NavigationBar title="Word Search" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Choose a category and puzzle size</Text>

        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category, index) => (
            <CategoryItem
              key={category.id}
              category={category}
              index={index}
              isSelected={selectedCategory === category.id}
              onSelect={() => setSelectedCategory(category.id)}
            />
          ))}
        </View>

        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
          style={styles.sizesContainer}>
          <Text style={styles.sectionTitle}>Puzzle Size</Text>
          <View style={styles.sizesGrid}>
            {SIZES.map(size => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeButton,
                  selectedSize === size.id && styles.selectedSizeButton,
                ]}
                onPress={() => setSelectedSize(size.id)}>
                <LinearGradient
                  colors={
                    selectedSize === size.id
                      ? ['#e77cff', '#d93cfc']
                      : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
                  }
                  style={styles.sizeButtonGradient}>
                  <Text style={styles.sizeName}>{size.name}</Text>
                  <Text style={styles.sizeDescription}>{size.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
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
            onStart({category: selectedCategory, size: selectedSize})
          }>
          <LinearGradient
            colors={
              selectedCategory && selectedSize
                ? ['#e77cff', '#d93cfc']
                : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
            }
            style={styles.playButtonGradient}>
            <Text style={styles.playButtonText}>Let's Play!</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryContainer: {
    width: ITEM_WIDTH,
    marginBottom: ITEM_SPACING,
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
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  sizesContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
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
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  sizeDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
