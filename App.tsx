/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaView, StyleSheet, useColorScheme} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import GridLetters from './src/components/GridLetters';
import AdBanner from './src/components/AdBanner';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <GestureHandlerRootView style={styles.sectionContainer}>
        <GridLetters
          blockSize={60}
          words={[
            'Hair',
            'Hotel',
            'Cannon',
            'Poetry',
            'Help',
            'Forget',
            'Kitchen',
            'Dog',
            'Mouse',
            'Zoo',
            'Food',
            'Vegetables',
            'Fruits',
            'Evening',
            'Wednesday',
            'Pyramid',
            'Pie',
            'Smart',
            'Hero',
            'Favour',
            'Support',
            'Geometry',
            'Math',
            'Yesterday',
            'Modern',
            'Medical',
            'Grass',
            'Ball',
            'Meditation',
            'Magic',
            'Audio',
            'Smartphone',
            'Hang',
            'House',
            'Friday',
            'Sound',
            'Voice',
            'Grow',
            'Frog',
            'Pen',
            'Garden',
            'Yellow',
            'Orange',
            'Table',
            'Chair',
            'Restaurant',
            'Giraffe',
            'Sun',
            'Penguin',
            'Air',
            'Hollow',
            'Weak',
            'Weekend',
            'Trouble',
            'Play',
            'Drama',
            'Elbow',
            'Hat',
            'Hungry',
            'Green',
            'Purple',
            'Nice',
            'Unique',
            'Elevator',
            'People',
            'Helmet',
            'Apple',
            'Banana',
            'Triangle',
            'West',
            'South',
            'Box',
            'Bus',
            'Bull',
            'Business',
            'Hot',
            'Warn',
            'Warm',
            'Ice',
            'Roll',
            'Grammar',
            'Ears',
            'Tail',
            'Bark',
            'Cat',
            'Rabbit',
            'Awaken',
            'Night',
            'Morning',
            'Afternoon',
            'Moon',
            'Diamond',
            'Stick',
            'Old',
            'Young',
            'Wide',
            'Thin',
            'Car',
            'Drive',
            'Rode',
            'Rude',
            'Please',
            'Try',
            'Care',
            'Good',
          ]}
        />
      </GestureHandlerRootView>
      <AdBanner backgroundColor={'#c568ff'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
