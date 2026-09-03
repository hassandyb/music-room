import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AsyncState } from '@/components/async-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as lyricsApi from '@/lib/api/lyrics';

export default function LyricsScreen() {
  const { title, artist } = useLocalSearchParams<{ trackId: string; title: string; artist: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const { data: lyrics, isLoading, isError, error } = useQuery({
    queryKey: ['lyrics', artist, title],
    queryFn: () => lyricsApi.fetchLyrics(artist, title),
    enabled: Boolean(artist && title),
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <IconSymbol name="quote.opening" size={22} color={colors.tint} />
          <View style={styles.headerText}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>{title}</ThemedText>
            <ThemedText style={[styles.artist, { color: colors.icon }]} numberOfLines={1}>{artist}</ThemedText>
          </View>
        </View>

        <AsyncState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!lyrics}
          emptyMessage="No lyrics found for this track.">
          <ThemedText style={styles.lyrics}>{lyrics}</ThemedText>
        </AsyncState>

        <ThemedText style={[styles.note, { color: colors.icon }]}>
          Lyrics via lyrics.ovh - Music Room has no lyrics of its own yet.
        </ThemedText>
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  artist: {
    fontSize: 13,
  },
  lyrics: {
    fontSize: 16,
    lineHeight: 26,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
