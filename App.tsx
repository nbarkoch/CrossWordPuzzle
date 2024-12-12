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
import GridLetters from './components/GridLetters';

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
            'Pee',
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
          ]}
        />
      </GestureHandlerRootView>
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
