import {Dimensions, useWindowDimensions} from 'react-native';
import {
  EdgeInsets,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

/**
 * Some devices (e.g. the iPhone Duo's folded display) report a zero top inset
 * because their camera / status pill sits on a side edge instead. Keep a little
 * breathing room at the top anyway so the header doesn't hug the rounded corner.
 */
export const MIN_TOP_INSET = 16;

const toContentInsets = (insets: EdgeInsets): EdgeInsets => ({
  top: Math.max(insets.top, MIN_TOP_INSET),
  right: insets.right,
  bottom: insets.bottom,
  left: insets.left,
});

/** Insets the app content is laid out inside (applied once, in Navigation). */
export const useContentInsets = (): EdgeInsets =>
  toContentInsets(useSafeAreaInsets());

/** Width available to screen content once side insets are removed. */
export const useContentWidth = (): number => {
  const {width} = useWindowDimensions();
  const {left, right} = useContentInsets();
  return width - left - right;
};

/**
 * Launch-time snapshot for module-level layout constants (the classic grid
 * computes its dimensions once, at import time).
 */
const initialWindow = Dimensions.get('window');

export const INITIAL_CONTENT_INSETS = toContentInsets(
  initialWindowMetrics?.insets ?? {top: 0, right: 0, bottom: 0, left: 0},
);

export const INITIAL_CONTENT_WIDTH =
  initialWindow.width - INITIAL_CONTENT_INSETS.left - INITIAL_CONTENT_INSETS.right;
