import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { Socket } from 'socket.io-client';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AsyncState } from '@/components/async-state';
import { TrackSearchSheet } from '@/components/track-search-sheet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import * as playlistsApi from '@/lib/api/playlists';
import { connectPlaylistSocket, disconnectPlaylistSocket, emitJoinPlaylist, emitLeavePlaylist } from '@/lib/api/playlist-socket';
import { ApiError } from '@/lib/api-client';
import { resolveMediaUrl } from '@/lib/api-config';
import { confirm, notify } from '@/lib/platform-alert';
import type {
  EditPolicyChangedPayload,
  MemberRemovedPayload,
  PlaylistEditPolicy,
  PlaylistInitialState,
  PlaylistLicense,
  PlaylistPreview,
  PlaylistSyncPayload,
  PlaylistTrackEntry,
  PlaylistUpdatedPayload,
  Track,
  TrackRemovedPayload,
  TracksAddedPayload,
} from '@/lib/types';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [showTrackSearch, setShowTrackSearch] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [onlineUsernames, setOnlineUsernames] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const currentUserId = state.status === 'authenticated' ? state.user.id : undefined;

  const query = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistsApi.getPlaylistPreview(id),
  });
  const playlist = query.data;

  // Owner can always edit (see PlaylistEditLicenseGuard) - safe to assume
  // ahead of the socket confirming; anyone else starts locked out until
  // INITIAL_STATE says otherwise, since we can't evaluate the license matrix
  // client-side without knowing it.
  useEffect(() => {
    if (playlist?.isOwner) setCanEdit(true);
  }, [playlist?.isOwner]);

  // coverUrl comes back from the API as a server-relative path (e.g.
  // "/files/xxx.jpg", see local-storage.service.ts) - resolve it against the
  // backend origin before handing it to <Image>, same as the event stream
  // URL in app/events/[id].tsx.
  useEffect(() => {
    if (!playlist?.coverUrl) {
      setResolvedCoverUrl(null);
      return;
    }
    let cancelled = false;
    resolveMediaUrl(playlist.coverUrl)
      .then((url) => {
        if (!cancelled) setResolvedCoverUrl(url);
      })
      .catch((err) => console.warn('Failed to resolve cover URL', err));
    return () => {
      cancelled = true;
    };
  }, [playlist?.coverUrl]);

  // Resolve the stream URL for whichever track is selected to play, same
  // pattern as the "now playing" track in app/events/[id].tsx.
  useEffect(() => {
    if (!playingTrackId) {
      setStreamUrl(null);
      return;
    }
    let cancelled = false;
    resolveMediaUrl(`/api/track/stream/${playingTrackId}`)
      .then((url) => {
        if (!cancelled) setStreamUrl(url);
      })
      .catch((err) => console.warn('Failed to resolve stream URL', err));
    return () => {
      cancelled = true;
    };
  }, [playingTrackId]);

  const player = useAudioPlayer(streamUrl ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  // Auto-play as soon as the newly selected track finishes loading.
  useEffect(() => {
    if (playingTrackId && streamUrl && playerStatus.isLoaded && !playerStatus.playing) {
      player.play();
    }
  }, [playingTrackId, streamUrl, playerStatus.isLoaded, playerStatus.playing, player]);

  // "Play All" advances to the next track when the current one ends; a
  // single track play just stops.
  useEffect(() => {
    if (!playerStatus.didJustFinish) return;
    if (isPlayingAll && playlist) {
      const sorted = [...playlist.tracks].sort((a, b) => a.position - b.position);
      const currentIndex = sorted.findIndex((t) => t.trackId === playingTrackId);
      const next = sorted[currentIndex + 1];
      if (next) {
        setPlayingTrackId(next.trackId);
      } else {
        setPlayingTrackId(null);
        setIsPlayingAll(false);
      }
    } else {
      setPlayingTrackId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStatus.didJustFinish]);

  const handleTrackPlayPause = (trackId: string) => {
    if (playingTrackId === trackId) {
      player.pause();
      setPlayingTrackId(null);
      setIsPlayingAll(false);
      return;
    }
    setIsPlayingAll(false);
    setPlayingTrackId(trackId);
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const sorted = [...playlist.tracks].sort((a, b) => a.position - b.position);
    setIsPlayingAll(true);
    setPlayingTrackId(sorted[0].trackId);
  };

  const licenseQuery = useQuery({
    queryKey: ['playlist', id, 'license'],
    queryFn: () => playlistsApi.getLicense(id),
    enabled: !!playlist?.isOwner,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['playlist', id] });

  const handleMutationError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        notify('Playlist changed', 'Someone else edited this playlist - refreshing.');
        invalidate();
        return;
      }
      notify('Error', err instanceof Error ? err.message : 'Something went wrong.');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  // Socket: joins this playlist's room and merges every broadcast into the
  // ['playlist', id] query cache, mirroring app/events/[id].tsx's pattern.
  // Every mutation below goes over REST (the gateway is push-only), so these
  // listeners mostly pick up OTHER clients' changes - but our own mutations
  // also echo back through here since room broadcasts include the sender,
  // which is why the merges below are idempotent (dedupe by id) rather than
  // assuming they only ever fire for remote changes.
  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | undefined;

    const handleInitialState = (payload: PlaylistInitialState) => {
      setCanEdit(payload.canEdit);
      setOnlineUsernames(payload.onlineUsernames);
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) =>
        old
          ? { ...old, version: payload.version, tracks: payload.tracks, isMember: payload.isMember, isOwner: payload.isOwner }
          : old
      );
    };
    const handlePlaylistUpdated = (payload: PlaylistUpdatedPayload) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => (old ? { ...old, ...payload } : old));
    };
    const handleTracksAdded = (payload: TracksAddedPayload) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => {
        if (!old) return old;
        const existingIds = new Set(old.tracks.map((t) => t.trackId));
        const incoming = payload.tracks.filter((t) => !existingIds.has(t.trackId));
        if (incoming.length === 0) return { ...old, version: payload.version };
        return { ...old, version: payload.version, trackCount: old.trackCount + incoming.length, tracks: [...old.tracks, ...incoming] };
      });
    };
    const handleTrackRemoved = (payload: TrackRemovedPayload) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => {
        if (!old) return old;
        const stillThere = old.tracks.some((t) => t.trackId === payload.trackId);
        if (!stillThere) return { ...old, version: payload.version };
        return { ...old, version: payload.version, trackCount: Math.max(0, old.trackCount - 1), tracks: old.tracks.filter((t) => t.trackId !== payload.trackId) };
      });
    };
    const handlePlaylistSync = (payload: PlaylistSyncPayload) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => {
        if (!old) return old;
        const positionByTrackId = new Map(payload.tracks.map((t) => [t.trackId, t.position]));
        const tracks = [...old.tracks]
          .map((t) => ({ ...t, position: positionByTrackId.get(t.trackId) ?? t.position }))
          .sort((a, b) => a.position - b.position);
        return { ...old, version: payload.version, tracks };
      });
    };
    const handleEditPolicyChanged = (payload: EditPolicyChangedPayload) => {
      queryClient.setQueryData<PlaylistLicense | undefined>(['playlist', id, 'license'], (old) => (old ? { ...old, ...payload } : old));
      const current = queryClient.getQueryData<PlaylistPreview>(['playlist', id]);
      if (current && !current.isOwner) {
        setCanEdit(current.isMember && payload.isEnabled && payload.editPolicy === 'EVERYONE');
      }
    };
    const handleMemberRemoved = (payload: MemberRemovedPayload) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) =>
        old ? { ...old, memberCount: Math.max(0, old.memberCount - 1) } : old
      );
      if (payload.userId === currentUserId) {
        notify('Removed', 'The owner removed you from this playlist.');
        router.back();
      }
    };
    const handlePlaylistDeleted = () => {
      notify('Playlist deleted', 'This playlist no longer exists.');
      router.back();
    };
    const handleUserOnline = ({ username }: { username: string }) =>
      setOnlineUsernames((old) => (old.includes(username) ? old : [...old, username]));
    const handleUserOffline = ({ username }: { username: string }) =>
      setOnlineUsernames((old) => old.filter((u) => u !== username));
    const handleSocketError = (err: unknown) => console.warn('[playlist socket]', err);

    connectPlaylistSocket().then((socket) => {
      if (cancelled) return;
      activeSocket = socket;

      socket.on('INITIAL_STATE', handleInitialState);
      socket.on('PLAYLIST_UPDATED', handlePlaylistUpdated);
      socket.on('TRACKS_ADDED', handleTracksAdded);
      socket.on('TRACK_REMOVED', handleTrackRemoved);
      socket.on('PLAYLIST_SYNC', handlePlaylistSync);
      socket.on('EDIT_POLICY_CHANGED', handleEditPolicyChanged);
      socket.on('MEMBER_REMOVED', handleMemberRemoved);
      socket.on('PLAYLIST_DELETED', handlePlaylistDeleted);
      socket.on('USER_ONLINE', handleUserOnline);
      socket.on('USER_JOINED', handleUserOnline);
      socket.on('USER_OFFLINE', handleUserOffline);
      socket.on('USER_LEFT', handleUserOffline);
      socket.on('error', handleSocketError);
      socket.on('connect', () => setSocketReady(true));
      if (socket.connected) setSocketReady(true);

      emitJoinPlaylist(socket, id);
    });

    return () => {
      cancelled = true;
      activeSocket?.off('INITIAL_STATE', handleInitialState);
      activeSocket?.off('PLAYLIST_UPDATED', handlePlaylistUpdated);
      activeSocket?.off('TRACKS_ADDED', handleTracksAdded);
      activeSocket?.off('TRACK_REMOVED', handleTrackRemoved);
      activeSocket?.off('PLAYLIST_SYNC', handlePlaylistSync);
      activeSocket?.off('EDIT_POLICY_CHANGED', handleEditPolicyChanged);
      activeSocket?.off('MEMBER_REMOVED', handleMemberRemoved);
      activeSocket?.off('PLAYLIST_DELETED', handlePlaylistDeleted);
      activeSocket?.off('USER_ONLINE', handleUserOnline);
      activeSocket?.off('USER_JOINED', handleUserOnline);
      activeSocket?.off('USER_OFFLINE', handleUserOffline);
      activeSocket?.off('USER_LEFT', handleUserOffline);
      activeSocket?.off('error', handleSocketError);
      if (activeSocket) emitLeavePlaylist(activeSocket, id);
      disconnectPlaylistSocket();
    };
  }, [id, queryClient, currentUserId]);

  const addTracksMutation = useMutation({
    mutationFn: (track: Track) => {
      if (!playlist) throw new Error('Playlist not loaded yet');
      return playlistsApi.addTracks(id, [track.id], playlist.version);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => {
        if (!old) return old;
        const existingIds = new Set(old.tracks.map((t) => t.trackId));
        const incoming = result.tracks.filter((t) => !existingIds.has(t.trackId));
        return { ...old, version: result.version, trackCount: old.trackCount + incoming.length, tracks: [...old.tracks, ...incoming] };
      });
    },
    onError: handleMutationError,
  });

  const removeTrackMutation = useMutation({
    mutationFn: (trackId: string) => {
      if (!playlist) throw new Error('Playlist not loaded yet');
      return playlistsApi.removeTrack(id, trackId, playlist.version);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) =>
        old
          ? { ...old, version: result.version, trackCount: Math.max(0, old.trackCount - 1), tracks: old.tracks.filter((t) => t.trackId !== result.trackId) }
          : old
      );
    },
    onError: handleMutationError,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ trackId, newPosition }: { trackId: string; newPosition: number }) => {
      if (!playlist) throw new Error('Playlist not loaded yet');
      return playlistsApi.reorderTrack(id, trackId, newPosition, playlist.version);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => {
        if (!old) return old;
        const positionByTrackId = new Map(result.tracks.map((t) => [t.trackId, t.position]));
        const tracks = [...old.tracks]
          .map((t) => ({ ...t, position: positionByTrackId.get(t.trackId) ?? t.position }))
          .sort((a, b) => a.position - b.position);
        return { ...old, version: result.version, tracks };
      });
    },
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: () => playlistsApi.deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      router.back();
    },
    onError: handleMutationError,
  });

  const joinMutation = useMutation({
    mutationFn: () => playlistsApi.joinPlaylist(id),
    onSuccess: invalidate,
    onError: handleMutationError,
  });

  const leaveMutation = useMutation({
    mutationFn: () => playlistsApi.leavePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      router.back();
    },
    onError: handleMutationError,
  });

  const licenseMutation = useMutation({
    mutationFn: (input: { editPolicy: PlaylistEditPolicy; isEnabled: boolean }) => playlistsApi.updateLicense(id, input),
    onSuccess: (license) => queryClient.setQueryData(['playlist', id, 'license'], license),
    onError: handleMutationError,
  });

  const confirmDelete = async () => {
    const confirmed = await confirm('Delete playlist?', 'This cannot be undone.', 'Delete');
    if (confirmed) deleteMutation.mutate();
  };

  const pickCover = async () => {
    if (!playlist?.isOwner) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify('Permission needed', 'Photo library access is needed to set a cover.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]) return;

      setUploadingCover(true);
      const updated = await playlistsApi.uploadPlaylistCover(id, result.assets[0].uri);
      queryClient.setQueryData<PlaylistPreview | undefined>(['playlist', id], (old) => (old ? { ...old, ...updated } : old));
    } catch (err) {
      notify('Error', err instanceof Error ? err.message : 'Could not upload cover.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDragEnd = ({ data, from, to }: { data: PlaylistTrackEntry[]; from: number; to: number }) => {
    if (from === to || !playlist) return;
    const moved = data[to];
    reorderMutation.mutate({ trackId: moved.trackId, newPosition: to + 1 });
  };

  const renderTrack = useCallback(
    ({ item, drag, isActive }: RenderItemParams<PlaylistTrackEntry>) => {
      const isThisPlaying = playingTrackId === item.trackId && playerStatus.playing;
      return (
        <ThemedView style={[styles.trackRow, { borderColor: colors.border, backgroundColor: isActive ? colors.surface : undefined }]}>
          <Pressable
            onPress={() => handleTrackPlayPause(item.trackId)}
            style={[styles.orderBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={8}>
            <Feather name={isThisPlaying ? 'pause' : 'play'} size={12} color={isThisPlaying ? colors.text : colors.tint} />
          </Pressable>
          {item.track.imageUrl ? (
            <Image source={{ uri: item.track.imageUrl }} style={styles.trackImage} />
          ) : (
            <ThemedView style={[styles.trackImage, styles.trackImagePlaceholder, { borderColor: colors.border }]}>
              <IconSymbol name="music.note" size={16} color={colors.icon} />
            </ThemedView>
          )}
          <ThemedView style={styles.trackInfo}>
            <ThemedText type="defaultSemiBold">{item.track.title}</ThemedText>
            <ThemedText style={styles.muted}>{item.track.artist}</ThemedText>
          </ThemedView>
          {canEdit && (
            <ThemedView style={styles.trackActions}>
              <Pressable onLongPress={drag} disabled={isActive} style={styles.dragHandle} hitSlop={8}>
                <ThemedText style={styles.muted}>⠿</ThemedText>
              </Pressable>
              <Pressable onPress={() => removeTrackMutation.mutate(item.trackId)} style={styles.removeButton} hitSlop={8}>
                <Feather name="trash-2" size={18} color={colors.icon} />
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      );
    },
    [canEdit, colors, removeTrackMutation, playingTrackId, playerStatus.playing]
  );

  return (
    <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
      {playlist ? (
        <ThemedView style={styles.container}>
          <Stack.Screen
            options={{
              headerRight: () =>
                playlist.isOwner ? (
                  <Pressable onPress={confirmDelete} disabled={deleteMutation.isPending} style={styles.deleteButton} hitSlop={8}>
                    {deleteMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Feather name="trash-2" size={20} color={colors.text} />
                    )}
                  </Pressable>
                ) : null,
            }}
          />
          <DraggableFlatList
            style={styles.list}
            containerStyle={styles.list}
            contentContainerStyle={styles.listContent}
            data={playlist.tracks}
            keyExtractor={(item) => item.id}
            renderItem={renderTrack}
            onDragEnd={handleDragEnd}
            dragItemOverflow
            ListEmptyComponent={<ThemedText style={styles.muted}>No tracks yet - add one.</ThemedText>}
            ListHeaderComponent={
              <ThemedView style={styles.headerContent}>
                <ThemedView style={styles.headerRow}>
                  <Pressable onPress={pickCover} disabled={!playlist.isOwner || uploadingCover} style={styles.coverPicker}>
                    {resolvedCoverUrl ? (
                      <Image source={{ uri: resolvedCoverUrl }} style={styles.cover} />
                    ) : (
                      <ThemedView style={[styles.cover, styles.coverPlaceholder, { borderColor: colors.border }]}>
                        <ThemedText style={styles.muted}>{playlist.isOwner ? 'Add cover' : '♪'}</ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                  <ThemedView style={styles.headerText}>
                    <ThemedText type="title">{playlist.name}</ThemedText>
                    {playlist.description ? <ThemedText style={styles.muted}>{playlist.description}</ThemedText> : null}
                    <ThemedText style={styles.muted}>
                      {playlist.visibility} · by {playlist.owner.username} · {playlist.trackCount} track{playlist.trackCount === 1 ? '' : 's'}
                    </ThemedText>
                    <ThemedText style={styles.muted}>
                      {playlist.memberCount} member{playlist.memberCount === 1 ? '' : 's'}
                      {onlineUsernames.length > 0 ? ` (${onlineUsernames.length} online)` : ''} · {socketReady ? 'live' : 'connecting…'}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {!playlist.isMember && !playlist.isOwner && (
                  <ThemedView style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    {playlist.isCollaborative ? (
                      <ThemedButton title="Join playlist" onPress={() => joinMutation.mutate()} loading={joinMutation.isPending} />
                    ) : (
                      <ThemedText style={styles.muted}>
                        This playlist&apos;s owner is on the free plan - free playlists can&apos;t have other members.
                      </ThemedText>
                    )}
                  </ThemedView>
                )}

                <ThemedView style={styles.actionsRow}>
                  {playlist.tracks.length > 0 && (
                    <ThemedButton
                      title={isPlayingAll ? 'Pause' : 'Play All'}
                      onPress={isPlayingAll ? () => handleTrackPlayPause(playingTrackId!) : handlePlayAll}
                      variant="primary"
                      style={styles.actionButton}
                    />
                  )}
                  {canEdit && (
                    <ThemedButton title="Add track" onPress={() => setShowTrackSearch(true)} variant="secondary" style={styles.actionButton} />
                  )}
                  <ThemedButton
                    title="Members"
                    onPress={() => router.push(`/playlists/${id}/collaborators`)}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  {playlist.isOwner && (
                    <ThemedButton
                      title="Invite"
                      onPress={() => router.push(`/playlists/${id}/invite`)}
                      variant="secondary"
                      style={styles.actionButton}
                    />
                  )}
                  {playlist.isMember && !playlist.isOwner && (
                    <ThemedButton
                      title="Leave"
                      onPress={() => leaveMutation.mutate()}
                      loading={leaveMutation.isPending}
                      variant="ghost"
                      style={styles.actionButton}
                    />
                  )}
                </ThemedView>

                {playlist.isOwner && (
                  <ThemedView style={[styles.licenseBox, { borderColor: colors.border }]}>
                    <ThemedText type="defaultSemiBold">Who can edit</ThemedText>
                    <ThemedView style={styles.segmentRow}>
                      {(['EVERYONE', 'INVITED_ONLY'] as const).map((option) => {
                        const active = licenseQuery.data?.editPolicy === option;
                        return (
                          <Pressable
                            key={option}
                            onPress={() =>
                              licenseMutation.mutate({ editPolicy: option, isEnabled: licenseQuery.data?.isEnabled ?? true })
                            }
                            style={[
                              styles.segment,
                              { borderColor: colors.border, backgroundColor: active ? colors.tint : colors.surface },
                            ]}>
                            <ThemedText type="defaultSemiBold" style={{ color: active ? '#fff' : colors.text, fontSize: 12 }}>
                              {option === 'EVERYONE' ? 'Any member' : 'Owner only'}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ThemedView>
                    {/* <ThemedView style={styles.switchRow}>
                      <ThemedText>Allow member edits</ThemedText>
                      <Switch
                        value={licenseQuery.data?.isEnabled ?? true}
                        onValueChange={(isEnabled) =>
                          licenseMutation.mutate({ editPolicy: licenseQuery.data?.editPolicy ?? 'EVERYONE', isEnabled })
                        }
                      />
                    </ThemedView> */}
                  </ThemedView>
                )}
              </ThemedView>
            }
          />

          <TrackSearchSheet
            visible={showTrackSearch}
            onClose={() => setShowTrackSearch(false)}
            onSelectTrack={(track) => addTracksMutation.mutate(track)}
          />
        </ThemedView>
      ) : null}
    </AsyncState>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deleteButton: {
    marginRight: 16,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    gap: 10,
  },
  headerContent: {
    gap: 10,
  },
  muted: {
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  coverPicker: {
    alignSelf: 'flex-start',
  },
  cover: {
    width: 84,
    height: 84,
    borderRadius: 10,
  },
  coverPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 16,
  },
  licenseBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trackImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  trackImagePlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
