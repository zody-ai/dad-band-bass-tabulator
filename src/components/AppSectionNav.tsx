import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { palette } from '../constants/colors';
import { useAuth } from '../features/auth/state/useAuth';

interface AppSectionNavProps {
  current: 'Home' | 'Library' | 'Setlist' | 'Import' | 'GoPro';
  onHome: () => void;
  onLibrary: () => void;
  onSetlist: () => void;
  onImport: () => void;
  onGoPro: () => void;
}

export function AppSectionNav({
  current,
  onHome,
  onLibrary,
  onSetlist,
  onImport,
  onGoPro,
}: AppSectionNavProps) {
  const { authState, logout, loadingAction } = useAuth();
  const signedInEmail = authState.type === 'AUTHENTICATED' ? authState.user.email : null;
  const isLoggingOut = loadingAction === 'logout';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <PrimaryButton
          label="Home"
          onPress={onHome}
          variant={current === 'Home' ? 'secondary' : 'ghost'}
          size="compact"
        />
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
          label="Community"
          onPress={onImport}
          variant={current === 'Import' ? 'secondary' : 'ghost'}
          size="compact"
        />
        <PrimaryButton
          label="Go Pro"
          onPress={onGoPro}
          variant={current === 'GoPro' ? 'secondary' : 'ghost'}
          size="compact"
        />
      </View>
      {authState.type === 'AUTHENTICATED' ? (
        <View style={styles.accountCluster}>
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>Signed in</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {signedInEmail ?? 'Unknown user'}
            </Text>
          </View>
          <PrimaryButton
            label={isLoggingOut ? 'Signing out...' : 'Sign out'}
            onPress={() => {
              if (!isLoggingOut) {
                void logout();
              }
            }}
            variant="secondary"
            size="compact"
            disabled={isLoggingOut}
            style={styles.signOutButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
  },
  accountCluster: {
    minWidth: 210,
    maxWidth: 260,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6c6ae',
    backgroundColor: '#fffaf2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  accountCopy: {
    gap: 1,
  },
  accountLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.textMuted,
    textAlign: 'right',
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.text,
    textAlign: 'right',
    fontWeight: '700',
  },
  signOutButton: {
    minHeight: 34,
    width: '100%',
  },
});
