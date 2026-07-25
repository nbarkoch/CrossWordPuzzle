import React from 'react';
import Svg, {Path} from 'react-native-svg';

type SmallStarProps = {
  size?: number;
  color?: string;
};

function SmallStar({size = 22, color = 'white'}: SmallStarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M0 10.6066C6.5 8.5899 8.5 6.5899 10.6066 2.28437e-05C12.5 6.5899 14.5 8.5899 21.2132 10.6066C14.5 12.5899 12.5 14.5899 10.6066 21.2132C8.5 14.5899 6.5 12.5899 0 10.6066Z"
        fill={color}
      />
    </Svg>
  );
}

export default SmallStar;
