import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {ArrowRight} from './decorations/arrows';

type MenuButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  tag?: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

function MenuButton({
  onPress,
  disabled = false,
  tag,
  title,
  subtitle,
  image,
}: MenuButtonProps) {
  return (
    <Pressable
      style={({pressed}) => [
        styles.outerBorder,
        {
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          transform: [{scale: pressed ? 0.97 : 1}],
        },
      ]}
      onPress={onPress}>
      <View style={styles.frame}>
        <View style={styles.card}>
          <View style={styles.cardClip}>
            <LinearGradient
              style={styles.cardGradient}
              colors={['#FDFBFE', '#EEDCFD']}>
              <View style={styles.iconRing}>
                <View style={styles.iconCircle}>
                  <Image resizeMode="cover" style={styles.icon} source={image} />
                </View>
              </View>
              <View style={styles.textColumn}>
                <Text style={styles.title}>{title}</Text>
                <Text numberOfLines={2} style={styles.subtitle}>
                  {subtitle}
                </Text>
              </View>
              <View style={styles.arrowColumn}>
                <View style={styles.arrowCircle}>
                  <ArrowRight size={25} stroke="#5322AD" />
                </View>
              </View>
              {tag && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerBorder: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#E2CDF850',
    borderRadius: 25,
  },
  frame: {
    backgroundColor: '#E2CDF8',
    borderRadius: 22,
    overflow: 'hidden',
    padding: 4,
    borderWidth: 1,
    borderColor: '#ffffff92',
  },
  card: {
    backgroundColor: '#FDFBFE',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 4},
    shadowRadius: 2,
    elevation: 2,
  },
  cardClip: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  iconRing: {
    borderWidth: 1,
    borderColor: '#0000003c',
    borderRadius: 50,
    padding: 3,
    backgroundColor: '#FDFBFE',
    shadowColor: '#723BD7',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 1,
    elevation: 2,
    alignSelf: "center"
  },
  iconCircle: {
    backgroundColor: '#723BD7',
    borderRadius: 50,
    padding: 7,
  },
  icon: {
    width: 70,
    height: 70,
  },
  textColumn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    gap: 5,
  },
  title: {
    fontSize: 22,
    color: '#4C258D',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    color: '#6758b1',
    fontWeight: '400',
    lineHeight: 20,
  },
  arrowColumn: {
    paddingEnd: 10,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  arrowCircle: {
    backgroundColor: '#E6D3FA',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#723BD7',
    shadowOpacity: 0.4,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 1,
    elevation: 2,
  },
  tag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#00000060',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default MenuButton;
