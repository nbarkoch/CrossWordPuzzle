import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize, TestIds} from 'react-native-google-mobile-ads';
import {Dimensions} from 'react-native';

const {width} = Dimensions.get('screen');

export const Banner = {width: 320, height: 30};
interface AdBannerProps {}

const AdBanner = ({}: AdBannerProps) => {
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : 'ca-app-pub-3655197897637289/5393134387';

  return (
    <View style={[styles.banner]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          customTargeting: {
            content_rating: 'general_audience',
            app_category: 'family_games',
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    minHeight: 50,
    position: 'absolute',
    bottom: 0,
    left: (width - Banner.width) / 2,
  },
});

export default AdBanner;
