import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as tracksApi from '@/lib/api/tracks';
import type { Track } from '@/lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
};

export function TrackSearchSheet({ visible, onClose, onSelectTrack }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setDebounced('');
    }
  }, [visible]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['track-search', debounced],
    queryFn: () => tracksApi.searchTracks(debounced),
    enabled: debounced.length > 0,
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="subtitle">Add a track</ThemedText>
          <ThemedButton title="Close" onPress={onClose} variant="ghost" />
        </ThemedView>

        <ThemedTextInput
          placeholder="Search for a song or artist"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        <ScrollView style={styles.results}>
          <AsyncState
            isLoading={debounced.length > 0 && isLoading}
            isError={isError}
            isEmpty={debounced.length > 0 && (data ?? []).length === 0}
            emptyMessage={`No tracks found for "${debounced}"`}>
            {(data ?? []).map((track) => (
              <Pressable
                key={track.id}
                onPress={() => {
                  onSelectTrack(track);
                  onClose();
                }}
                style={[styles.row, { borderColor: colors.border }]}>
                <ThemedText type="defaultSemiBold">{track.title}</ThemedText>
                <ThemedText style={styles.muted}>{track.artist}</ThemedText>
              </Pressable>
            ))}
          </AsyncState>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  results: {
    flex: 1,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  muted: {
    opacity: 0.6,
  },
});
