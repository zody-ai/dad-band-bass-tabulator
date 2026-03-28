import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

interface AppSectionNavProps {
  current: 'Library' | 'Setlist' | 'Import';
  onLibrary: () => void;
  onSetlist: () => void;
  onAbout: () => void;
}

export function AppSectionNav({
  current,
  onLibrary,
  onSetlist,
  onAbout,
}: AppSectionNavProps) {
  return (
    <View style={styles.row}>
      <PrimaryButton
        label="Library"
        onPress={onLibrary}
        variant={current === 'Library' ? 'secondary' : 'ghost'}
        size="compact"
      />
      <PrimaryButton
        label="Setlist"
        onPress={onSetlist}
        variant={current === 'Setlist' ? 'secondary' : 'ghost'}
        size="compact"
      />
      <PrimaryButton
        label="About"
        onPress={onAbout}
        variant="ghost"
        size="compact"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
