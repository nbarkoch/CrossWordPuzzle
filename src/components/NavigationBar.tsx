import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Canvas, Path} from '@shopify/react-native-skia';

type NavigationBarProps = {
  title: string;
  onBack: () => void;
};

const backArrow =
  'M8.05664 14.2168C8.05664 14.5097 8.16211 14.7676 8.38477 14.9902L17.6777 24.0722C17.877 24.2832 18.1347 24.3887 18.4394 24.3887C19.0488 24.3887 19.5175 23.9316 19.5175 23.3222C19.5175 23.0176 19.3886 22.7597 19.2011 22.5605L10.6699 14.2168L19.2011 5.87304C19.3886 5.67383 19.5175 5.4043 19.5175 5.11133C19.5175 4.50195 19.0488 4.04492 18.4394 4.04492C18.1347 4.04492 17.877 4.15039 17.6777 4.34961L8.38477 13.4434C8.16211 13.6543 8.05664 13.9238 8.05664 14.2168Z';

const NavigationBar: React.FC<NavigationBarProps> = ({title, onBack}) => {
  return (
    <LinearGradient
      colors={['#994CFD', '#6F54FB']}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}>
      <View style={styles.content}>
        <View style={styles.placeholder} />
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Canvas style={styles.canvas}>
            <Path path={backArrow} color="#FFFFFF" />
          </Canvas>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: 24,
    height: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  placeholder: {
    width: 40,
  },
});

export default NavigationBar;
