import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { ThemedView } from '@/components/themed-view';
import { ThemedSafeView } from '@/components/themed-safe-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url';
import * as playlistsApi from '@/lib/api/playlists';
import { connectPlaylistSocket, disconnectPlaylistSocket } from '@/lib/api/playlist-socket';
import type { Playlist } from '@/lib/types';

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const coverUrl = useResolvedMediaUrl(playlist.coverUrl);

  return (
    <Pressable
      onPress={() => router.push(`/playlists/${playlist.id}`)}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
      ) : (
        <ThemedView style={[styles.cover, styles.coverPlaceholder, { borderColor: colors.border }]}>
          <IconSymbol name="music.note.list" size={20} color={colors.icon} />
        </ThemedView>
      )}
      <View style={styles.cardText}>
        <ThemedText type="defaultSemiBold">{playlist.name}</ThemedText>
        <ThemedText style={styles.muted}>
          {playlist.visibility} · by {playlist.owner.username}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function PlaylistsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'mine' | 'public'>('mine');

  const mineQuery = useQuery({ queryKey: ['playlists', 'mine'], queryFn: playlistsApi.listMyPlaylists });
  const publicQuery = useQuery({ queryKey: ['playlists', 'public'], queryFn: playlistsApi.listPublicPlaylists });
  const invitationsQuery = useQuery({ queryKey: ['playlist-invitations'], queryFn: playlistsApi.getMyInvitations });

  // Namespace-wide broadcasts (not room-scoped - see playlist.gateway.ts's
  // broadcastPlaylistListCreated/Deleted) so this list stays live without a
  // manual pull-to-refresh. Only PUBLIC creations are ever broadcast here.
  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | undefined;

    const handleCreated = (playlist: Playlist) => {
      queryClient.setQueryData<Playlist[] | undefined>(['playlists', 'public'], (old) =>
        old && !old.some((p) => p.id === playlist.id) ? [playlist, ...old] : old
      );
    };
    const handleDeleted = ({ id }: { id: string }) => {
      queryClient.setQueryData<Playlist[] | undefined>(['playlists', 'public'], (old) =>
        old?.filter((p) => p.id !== id)
      );
      queryClient.setQueryData<Playlist[] | undefined>(['playlists', 'mine'], (old) => old?.filter((p) => p.id !== id));
    };

    connectPlaylistSocket().then((socket) => {
      if (cancelled) return;
      activeSocket = socket;
      socket.on('PLAYLIST_LIST_CREATED', handleCreated);
      socket.on('PLAYLIST_LIST_DELETED', handleDeleted);
    });

    return () => {
      cancelled = true;
      activeSocket?.off('PLAYLIST_LIST_CREATED', handleCreated);
      activeSocket?.off('PLAYLIST_LIST_DELETED', handleDeleted);
      disconnectPlaylistSocket();
    };
  }, [queryClient]);

  const active = tab === 'mine' ? mineQuery : publicQuery;
  const invitationCount = invitationsQuery.data?.length ?? 0;

  return (
    <ThemedSafeView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title">Playlists</ThemedText>
        <Pressable
          onPress={() => router.push('/playlists/create')}
          style={[styles.createButton, { backgroundColor: colors.tint }]}>
          <IconSymbol name="plus" size={16} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.createButtonText}>New playlist</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedButton
        title={invitationCount > 0 ? `Invitations (${invitationCount})` : 'Invitations'}
        onPress={() => router.push('/playlists/invitations')}
        variant="secondary"
      />

      <ThemedView style={styles.segmentRow}>
        {(['mine', 'public'] as const).map((option) => {
          const isActive = option === tab;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[
                styles.segment,
                { borderColor: colors.border, backgroundColor: isActive ? colors.tint : colors.surface },
              ]}>
              <ThemedText type="defaultSemiBold" style={{ color: isActive ? '#fff' : colors.text, fontSize: 12 }}>
                {option === 'mine' ? 'Mine' : 'Discover'}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      <AsyncState
        isLoading={active.isLoading}
        isError={active.isError}
        error={active.error}
        isEmpty={(active.data ?? []).length === 0}
        emptyMessage={tab === 'mine' ? 'No playlists yet.' : 'No public playlists yet.'}>
        <FlatList
          data={active.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={active.refetch} />}
          renderItem={({ item }) => <PlaylistCard playlist={item} />}
        />
      </AsyncState>
    </ThemedSafeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 0,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createButtonText: {
    color: '#fff',
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  coverPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  muted: {
    opacity: 0.7,
  },
});
