import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SmallStar from './star';
import React from 'react';

function LineDecoration() {
  return (
    <View style={styles.divider}>
      <LinearGradient
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        colors={['#D9BCFC', '#D9BCFC00']}
        style={styles.dividerLine2}
      />
      <SmallStar size={12} color="#D9BCFC" />
      <LinearGradient
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        colors={['#D9BCFC', '#D9BCFC00']}
        style={styles.dividerLine}
      />
    </View>
  );
}

export default LineDecoration;

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dividerLine: {
    height: 1,
    flex: 1,
  },
  dividerLine2: {
    height: 1,
    flex: 1,
    transform: [{scaleX: -1}],
  },
});
