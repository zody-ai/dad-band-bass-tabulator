import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { resolveUpgradeTrigger, useSubscription, useUpgradePrompt } from '../features/subscription';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { Song } from '../types/models';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Setlist'>,
  NativeStackScreenProps<RootStackParamList>
>;

const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

const SONG_QUIPS = [
  "We'll probably start this too fast.",
  'Someone will forget the bridge.',
  'Great if we nail it.',
  'Goes well after a beer.',
  'The one everyone knows.',
  'Counts in differently every time.',
  'Might need to rehearse this one.',
  'Deceptively tricky.',
];

function getSongQuip(id: string): string {
  const code = id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return SONG_QUIPS[code % SONG_QUIPS.length];
}

function DadBandBadge() {
  return (
    <Svg width={80} height={80} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="54" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={3} />
      <Circle cx="60" cy="60" r="44" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={2} strokeDasharray="4 3" />
      <SvgText x="60" y="65" textAnchor="middle" fontSize={18} fontWeight="bold" letterSpacing={2} fill={NAMEPLATE_TEXT} fontFamily="Arial">DAD BAND</SvgText>
      <SvgText x="60" y="24" textAnchor="middle" fontSize={8} letterSpacing={1.5} fill={NAMEPLATE_GOLD} fontFamily="Arial">SETLIST</SvgText>
      <SvgText x="60" y="108" textAnchor="middle" fontSize={7} letterSpacing={1.2} fill={NAMEPLATE_GOLD} fontFamily="Arial">PLAN SUBJECT TO CHANGE</SvgText>
    </Svg>
  );
}

export function SetlistScreen({ navigation }: Props) {
  const { tier, capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const {
    songs,
    setlist,
    setlists,
    activeSetlistId,
    setActiveSetlist,
    createSetlist,
    renameSetlist,
    deleteSetlist,
    addSongToSetlist,
    removeSongFromSetlist,
    moveSetlistSong,
  } = useBassTab();
  const [statusMessage, setStatusMessage] = useState(
    'Build gig-ready running orders and keep transitions tight.',
  );
  const [setlistNameDraft, setSetlistNameDraft] = useState(setlist.name);
  const [setlistPendingDelete, setSetlistPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const freeSetlistLimit = capabilities.maxSetlists ?? 1;

  useEffect(() => {
    setSetlistNameDraft(setlist.name);
  }, [setlist.id, setlist.name]);

  const orderedSongs = useMemo(
    () =>
      setlist.songIds
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean) as Song[],
    [setlist.songIds, songs],
  );

  const availableSongs = useMemo(
    () => songs.filter((song) => !setlist.songIds.includes(song.id)),
    [setlist.songIds, songs],
  );

  const handleCreateSetlist = () => {
    try {
      const created = createSetlist();
      setStatusMessage(`Created ${created.name}.`);
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not create setlist.';
      setStatusMessage(message);
    }
  };

  const moveSong = (songId: string, direction: -1 | 1) => {
    moveSetlistSong(songId, direction);
  };

  const removeSong = (songId: string) => {
    removeSongFromSetlist(songId);
  };

  const addSong = (songId: string) => {
    addSongToSetlist(songId);
  };

  const handleRenameSetlist = () => {
    const nextName = setlistNameDraft.trim();

    if (!nextName) {
      setStatusMessage('Setlist name cannot be empty.');
      return;
    }

    renameSetlist(setlist.id, nextName);
    setStatusMessage(`Renamed setlist to "${nextName}".`);
  };

  const handleDeleteSetlist = () => {
    if (setlists.length <= 1) {
      setStatusMessage('Keep at least one setlist in your account.');
      return;
    }

    setSetlistPendingDelete({ id: setlist.id, name: setlist.name });
  };

  const confirmDeleteSetlist = () => {
    if (!setlistPendingDelete) {
      return;
    }

    deleteSetlist(setlistPendingDelete.id);
    setSetlistPendingDelete(null);
    setStatusMessage(`Deleted "${setlistPendingDelete.name}".`);
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.navRow}>
          <AppSectionNav
            current="Setlist"
            onHome={() => navigation.navigate('Home')}
            onLibrary={() => navigation.navigate('Library')}
            onSetlist={() => navigation.navigate('Setlist')}
            onImport={() => navigation.navigate('Import')}
            onAICreate={() => navigation.navigate('AICreate')}
            onGoPro={() => navigation.navigate('Upgrade')}
            onAccount={() => navigation.navigate('Account')}
          />
        </View>

        <View style={styles.nameplate}>
          <View style={styles.nameplateInner}>
            <View style={styles.nameplateText}>
              <Text style={styles.nameplateTitle}>Dad Band Setlist 🎸</Text>
              <Text style={styles.nameplateSubtitle}>Plan the set. Ignore it live.</Text>
              <View style={styles.warningPill}>
                <Text style={styles.warningPillText}>⚠️ Order may not survive contact with drummer</Text>
              </View>
            </View>
            <View style={styles.badgeSlap}>
              <DadBandBadge />
            </View>
          </View>
        </View>

        <View style={styles.planRow}>
          <Text style={styles.planText}>
            {tier === 'PRO'
              ? 'Pro — as many setlists as you can handle.'
              : `Free includes ${freeSetlistLimit} setlist${freeSetlistLimit === 1 ? '' : 's'}.`}
          </Text>
          {tier !== 'PRO' ? (
            <Pressable onPress={() => navigation.navigate('Upgrade')}>
              <Text style={styles.planLink}>Upgrade to Pro →</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <PrimaryButton
            label="Play Setlist"
            onPress={() => navigation.navigate('SetlistPerformance', { setlistId: activeSetlistId })}
            disabled={orderedSongs.length === 0}
          />
          <PrimaryButton
            label="Start a new mess"
            onPress={handleCreateSetlist}
            variant="secondary"
          />
          {orderedSongs.length > 0 ? (
            <PrimaryButton
              label={tier === 'PRO' ? 'Export Multi-Page PDF' : 'Export Multi-Page PDF (PRO)'}
              onPress={() => navigation.navigate('ExportSetlist')}
              variant="ghost"
            />
          ) : null}
        </View>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {setlists.length > 0 ? (
        <View style={styles.switcher}>
          <Text style={styles.switcherLabel}>Setlists</Text>
          <View style={styles.switcherOptions}>
            {setlists.map((item) => (
              <PrimaryButton
                key={item.id}
                label={item.name}
                onPress={() => setActiveSetlist(item.id)}
                variant={activeSetlistId === item.id ? 'primary' : 'ghost'}
                size="compact"
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.manageCard}>
        <Text style={styles.manageTitle}>Manage Setlist</Text>
        <TextInput
          value={setlistNameDraft}
          onChangeText={setSetlistNameDraft}
          placeholder="Setlist name"
          placeholderTextColor={palette.textMuted}
          style={styles.nameInput}
        />
        <View style={styles.manageActions}>
          <PrimaryButton
            label="Rename"
            onPress={handleRenameSetlist}
            variant="secondary"
            size="compact"
          />
          <PrimaryButton
            label="Delete Setlist"
            onPress={handleDeleteSetlist}
            variant="danger"
            size="compact"
            disabled={setlists.length <= 1}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Planned (subject to chaos)</Text>
        <Text style={styles.sectionSubtitle}>
          Songs in the order the drummer will probably count in wrong.
        </Text>

        {orderedSongs.length === 0 ? (
          <EmptyState
            title="Nothing planned yet."
            description="We'll just shout keys at each other."
          />
        ) : (
          orderedSongs.map((song, index) => (
            <View key={song.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.copyBlock}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  <Text style={styles.artistText}>{song.artist}</Text>
                  <Text style={styles.songSubtext}>{getSongQuip(song.id)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{song.key}</Text>
                <Text style={styles.metaText}>{song.tuning}</Text>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="Open"
                  onPress={() => navigation.navigate('PerformanceView', { songId: song.id })}
                  variant="ghost"
                  size="compact"
                />
                <PrimaryButton
                  label="Up"
                  onPress={() => moveSong(song.id, -1)}
                  variant="secondary"
                  size="compact"
                />
                <PrimaryButton
                  label="Down"
                  onPress={() => moveSong(song.id, 1)}
                  variant="secondary"
                  size="compact"
                />
                <PrimaryButton
                  label="Remove"
                  onPress={() => removeSong(song.id)}
                  variant="danger"
                  size="compact"
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pull in another one</Text>
        <Text style={styles.sectionSubtitle}>
          Pull in anything you might need before the next rehearsal detour.
        </Text>

        {availableSongs.length === 0 ? (
          <EmptyState
            title="No more songs to add"
            description="Every library song is already in this setlist."
          />
        ) : (
          availableSongs.map((song) => (
            <View key={song.id} style={styles.libraryCard}>
              <View style={styles.libraryCopy}>
                <Text style={styles.libraryTitle}>{song.title}</Text>
                <Text style={styles.libraryMeta}>
                  {song.artist} • {song.key} • {song.tuning}
                </Text>
              </View>
              <PrimaryButton
                label="Add to set"
                onPress={() => addSong(song.id)}
                size="compact"
              />
            </View>
          ))
        )}
      </View>

      <Modal
        visible={Boolean(setlistPendingDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setSetlistPendingDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete setlist?</Text>
            <Text style={styles.modalText}>
              {setlistPendingDelete
                ? `Are you sure you want to delete "${setlistPendingDelete.name}"?`
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setSetlistPendingDelete(null)}
                variant="ghost"
              />
              <PrimaryButton
                label="Delete"
                onPress={confirmDeleteSetlist}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 28,
  },
  header: {
    gap: 12,
  },
  navRow: {
    marginBottom: 0,
  },
  nameplate: {
    backgroundColor: NAMEPLATE_BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: NAMEPLATE_GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  nameplateInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameplateText: {
    flex: 1,
    gap: 8,
  },
  nameplateTitle: {
    fontFamily: brandDisplayFontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: NAMEPLATE_TEXT,
    flexShrink: 1,
  },
  nameplateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: NAMEPLATE_MUTED,
    fontStyle: 'italic',
  },
  warningPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2e1f0a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7a5520',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warningPillText: {
    fontSize: 11,
    color: '#d4a04a',
    fontWeight: '600',
  },
  badgeSlap: {
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 5,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  planText: {
    fontSize: 12,
    color: palette.textMuted,
    flex: 1,
  },
  planLink: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.accent,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.textMuted,
  },
  switcher: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 8,
  },
  switcherLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switcherOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  manageCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 10,
  },
  manageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.text,
  },
  nameInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: palette.text,
  },
  manageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  orderBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primary,
  },
  copyBlock: {
    flex: 1,
    gap: 4,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  artistText: {
    fontSize: 15,
    color: palette.textMuted,
  },
  songSubtext: {
    fontSize: 11,
    color: palette.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaText: {
    fontSize: 14,
    color: palette.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  libraryCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  libraryCopy: {
    flex: 1,
    gap: 4,
  },
  libraryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  libraryMeta: {
    fontSize: 14,
    color: palette.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
});
