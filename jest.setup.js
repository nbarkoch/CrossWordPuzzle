/* global jest */

import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  Reanimated.default.call = () => {};

  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  const initialMetrics = {
    frame: {x: 0, y: 0, width: 0, height: 0},
    insets: {top: 0, left: 0, right: 0, bottom: 0},
  };

  return {
    initialMetrics,
    SafeAreaFrameContext: React.createContext(initialMetrics.frame),
    SafeAreaInsetsContext: React.createContext(initialMetrics.insets),
    SafeAreaProvider: props => <View {...props} />,
    SafeAreaConsumer: ({children}) =>
      children({
        frame: initialMetrics.frame,
        insets: initialMetrics.insets,
      }),
    SafeAreaView: props => <View {...props} />,
    useSafeAreaInsets: () => initialMetrics.insets,
    useSafeAreaFrame: () => initialMetrics.frame,
  };
});

jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: () => null,
  BannerAdSize: {
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  },
  TestIds: {
    BANNER: 'test-banner',
  },
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');

  return props => <View {...props} />;
});

jest.mock('lottie-react-native', () => {
  const React = require('react');
  const {View} = require('react-native');

  return React.forwardRef((props, ref) => <View {...props} ref={ref} />);
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const {View} = require('react-native');

  const makePath = () => ({
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    cubicTo: jest.fn(),
    quadTo: jest.fn(),
    close: jest.fn(),
    addCircle: jest.fn(),
    addRect: jest.fn(),
    addPath: jest.fn(),
    reset: jest.fn(),
    transform: jest.fn(),
    isEmpty: jest.fn(() => false),
    copy: jest.fn(() => makePath()),
  });

  const makeMatrix = () => ({
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
  });

  const Component = props => <View {...props} />;

  return {
    Canvas: Component,
    Group: Component,
    Path: Component,
    Skia: {
      Matrix: makeMatrix,
      Path: {
        Make: makePath,
      },
    },
    vec: (x, y) => ({x, y}),
  };
});
