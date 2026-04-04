import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { resolveUpgradeTrigger, useUpgradePrompt } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportDetail'>;

export function ImportDetailScreen({ navigation, route }: Props) {
  const { type } = route.params;
  const { showUpgradePrompt } = useUpgradePrompt();
  const { createSong } = useBassTab();

  const title = type === 'image' ? 'Dad Band Bass Image Import' : 'Dad Band Bass PDF Import';

  const description =
    type === 'image'
      ? 'Camera import and OCR are stubbed for now. Use this flow to create a blank draft song from a chart photo.'
      : 'PDF parsing is stubbed for now. Use this flow to spin up a blank draft song from a PDF-based chart.';

  const handleCreateDraft = async () => {
    try {
      const song = await createSong({
        title: type === 'image' ? 'Imported Image Draft' : 'Imported PDF Draft',
        artist: 'Needs Review',
      });

      navigation.replace('SongEditor', { songId: song.id });
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      console.warn('Could not create imported draft song', error);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.stubPanel}>
          <Text style={styles.stubLabel}>Stubbed MVP Flow</Text>
          <Text style={styles.stubText}>
            In a later pass, this screen can host file picking, preview, and OCR mapping.
          </Text>
        </View>

        <PrimaryButton label="Create Draft Song" onPress={handleCreateDraft} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
    color: palette.textMuted,
  },
  stubPanel: {
    backgroundColor: palette.primaryMuted,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  stubLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stubText: {
    fontSize: 16,
    lineHeight: 22,
    color: palette.text,
  },
});
