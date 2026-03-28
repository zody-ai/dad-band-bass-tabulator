import { Platform } from 'react-native';

export const brandDisplayFontFamily =
  Platform.select({
    ios: 'HelveticaNeue-Bold',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }) ?? 'sans-serif';
