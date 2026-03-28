import { StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { RootStackParamList, TabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Import'>,
  NativeStackScreenProps<RootStackParamList>
>;

const importOptions = [
  {
    key: 'image',
    title: 'Import From Image',
    description: 'Bring in camera roll photos, scribbled notes, or that blurry rehearsal-room whiteboard shot.',
  },
  {
    key: 'pdf',
    title: 'Import From PDF',
    description: 'Pull in cleaner charts exported from desktop or forwarded by the one organized bandmate.',
  },
  {
    key: 'paste',
    title: 'Paste Tab Text',
    description: 'Turn scrappy copied tab into a draft chart you can fix quickly and actually use.',
  },
] as const;

export function ImportScreen({ navigation }: Props) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Dad Band Bass Plus Imports</Text>
        <Text style={styles.subtitle}>
          Import is a Dad Band Bass Plus feature. The free version keeps editing, setlists, and live view focused.
        </Text>
        <View style={styles.headerActionRow}>
          <PrimaryButton
            label="About"
            onPress={() => navigation.navigate('Welcome')}
            variant="ghost"
          />
        </View>
      </View>

      <View style={styles.plusCard}>
        <View style={styles.plusBadge}>
          <Text style={styles.plusBadgeLabel}>Plus</Text>
        </View>
        <Text style={styles.plusTitle}>Imports are available in Dad Band Bass Plus</Text>
        <Text style={styles.plusDescription}>
          Dad Band Bass Plus will handle imports. Forum access and support can sit here later too, but for now this makes it clear those tools are not in the free version.
        </Text>
      </View>

      {importOptions.map((option) => (
        <View key={option.key} style={styles.card}>
          <View style={styles.copyBlock}>
            <Text style={styles.cardTitle}>{option.title}</Text>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </View>

          <View style={styles.lockedRow}>
            <View style={styles.lockedPill}>
              <Text style={styles.lockedPillLabel}>Plus Only</Text>
            </View>
            <Text style={styles.lockedText}>Not available in the free version</Text>
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4b5563',
  },
  headerActionRow: {
    paddingTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  plusCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 10,
  },
  plusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  plusBadgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff7ed',
  },
  plusTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: '#f8fafc',
  },
  plusDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#d1d5db',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 16,
  },
  copyBlock: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  cardDescription: {
    fontSize: 16,
    color: palette.textMuted,
    lineHeight: 22,
  },
  lockedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  lockedPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(154, 52, 18, 0.16)',
  },
  lockedPillLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#9a3412',
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
});
