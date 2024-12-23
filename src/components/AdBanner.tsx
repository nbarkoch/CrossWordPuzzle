import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize, TestIds} from 'react-native-google-mobile-ads';

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
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: 'black',
  },
});

export default AdBanner;
