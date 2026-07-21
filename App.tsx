/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {I18nManager, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AdBanner from '~/components/AdBanner';
import Navigation from '~/screens/Navigation';

function App(): React.ReactElement {
  I18nManager.allowRTL(false);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.sectionContainer}>
        <Navigation />
      </GestureHandlerRootView>
      <AdBanner />
    </SafeAreaProvider>
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
