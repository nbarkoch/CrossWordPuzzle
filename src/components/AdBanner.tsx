import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize, TestIds} from 'react-native-google-mobile-ads';
import {useContentInsets, useContentWidth} from '~/utils/safeLayout';

export const Banner = {width: 320, height: 50};
interface AdBannerProps {}

const AdBanner = ({}: AdBannerProps) => {
  const {bottom, left} = useContentInsets();
  const contentWidth = useContentWidth();
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : 'ca-app-pub-3655197897637289/5393134387';

  return (
    <View
      style={[
        styles.banner,
        {
          height: Math.max(bottom, Banner.height),
          // Center within the content column, not the full screen.
          left: left + (contentWidth - Banner.width) / 2,
        },
      ]}>
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
  },
});

export default AdBanner;
