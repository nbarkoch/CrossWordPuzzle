import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ArrowProps {
  size: number;
  stroke?: string;
  strokeWidth?: number;
}

export const ArrowRight = ({
  size,
  stroke = '#321EA2',
  strokeWidth = 6,
}: ArrowProps) => (
  <Svg width={size} height={(size * 52) / 40} viewBox="0 0 40 52" fill="none">
    <Path
      d="M15 16 L26 26 L15 36"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ArrowLeft = ({
  size,
  stroke = '#321EA2',
  strokeWidth = 6,
}: ArrowProps) => (
  <Svg width={size} height={(size * 52) / 40} viewBox="0 0 40 52" fill="none">
    <Path
      d="M25 16 L14 26 L25 36"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
