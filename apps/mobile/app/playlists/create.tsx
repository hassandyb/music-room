import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as playlistsApi from '@/lib/api/playlists';
import { ApiError } from '@/lib/api-client';
import type { PlaylistVisibility } from '@/lib/types';

export default function CreatePlaylistScreen() {
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PlaylistVisibility>('PUBLIC');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Give the playlist a name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const playlist = await playlistsApi.createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      await queryClient.invalidateQueries({ queryKey: ['playlists'] });
      router.replace(`/playlists/${playlist.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 402
          ? 'Free accounts are limited to a single playlist - upgrade to create more.'
          : err instanceof Error
            ? err.message
            : 'Could not create playlist.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <ThemedTextInput placeholder="Playlist name" value={name} onChangeText={setName} />
      <ThemedTextInput
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <ThemedText type="defaultSemiBold">Visibility</ThemedText>
      <ThemedView style={styles.segmentRow}>
        {(['PUBLIC', 'PRIVATE'] as const).map((option) => {
          const active = option === visibility;
          return (
            <Pressable
              key={option}
              onPress={() => setVisibility(option)}
              style={[
                styles.segment,
                { borderColor: colors.border, backgroundColor: active ? colors.tint : colors.surface },
              ]}>
              <ThemedText type="defaultSemiBold" style={{ color: active ? '#fff' : colors.text, fontSize: 12 }}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <ThemedButton title="Create playlist" onPress={handleSubmit} loading={loading} />
    </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: 24,
    gap: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: {
    color: '#ff4d4d',
  },
});
