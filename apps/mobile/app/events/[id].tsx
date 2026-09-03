import { useEffect, useRef, useState, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import type { Socket } from 'socket.io-client';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { AsyncState } from '@/components/async-state';
import { TrackSearchSheet } from '@/components/track-search-sheet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import * as eventsApi from '@/lib/api/events';
import * as usersApi from '@/lib/api/users';
import { resolveMediaUrl } from '@/lib/api-config';
import { notify } from '@/lib/platform-alert';
import {
  connectEventSocket,
  disconnectEventSocket,
  emitAddTrackToEvent,
  emitJoinEvent,
  emitJoinRoom,
  emitStartEvent,
  emitVoteForTrack,
} from '@/lib/api/socket';
import * as Location from 'expo-location';
import type { Event, EventTrack, Track } from '@/lib/types';

const formatEventTime = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [socketReady, setSocketReady] = useState(false);
  const [showTrackSearch, setShowTrackSearch] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<Record<string, string>>({});
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // These are fire-and-forget socket emits with no ack, so a fast double-tap
  // can fire the same action twice before the broadcast that would normally
  // update the UI comes back - lock the button as soon as it's pressed.
  const [startingRound, setStartingRound] = useState(false);
  const [pendingVoteTrackId, setPendingVoteTrackId] = useState<string | null>(null);

  const currentUserId = state.status === 'authenticated' ? state.user.id : undefined;
  const joinAttemptedRef = useRef(false);

  const eventQuery = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getEvent(id),
  });

  const searchQuery = useQuery({
    queryKey: ['users-search', inviteQuery],
    queryFn: () => usersApi.searchUsers(inviteQuery),
    enabled: showInvite && inviteQuery.trim().length > 0,
  });

  const event = eventQuery.data;

  // Socket connection + live broadcast handling - lives for the screen's
  // lifetime, independent of query data changes (see joinAttemptedRef effect
  // below for the one-time membership check, kept separate so this effect
  // doesn't tear down/reconnect the socket every time the cache updates).
  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | undefined;

    const handleEventDetails = (payload: { data: Event | null }) => {
      if (payload.data) queryClient.setQueryData(['event', id], payload.data);
    };
    const handleEventUpdated = (payload: { data: Partial<Event> | null }) => {
      if (!payload.data) return;
      queryClient.setQueryData<Event | undefined>(['event', id], (old) =>
        old ? { ...old, ...payload.data } : old
      );
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    };

    const handleEventTracksUpdated = (payload: { data: { track: EventTrack } }) => {
      queryClient.setQueryData<Event | undefined>(['event', id], (old) => {
        if (!old) return old;
        const incoming = payload.data.track;
        const exists = old.tracks.some((t) => t.trackId === incoming.trackId);
        return {
          ...old,
          tracks: exists
            ? old.tracks.map((t) => (t.trackId === incoming.trackId ? incoming : t))
            : [...old.tracks, incoming],
        };
      });
    };
    const handleEventVoteForTrack = (payload: { data: EventTrack }) => {
      queryClient.setQueryData<Event | undefined>(['event', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          tracks: old.tracks.map((t) => (t.trackId === payload.data.trackId ? payload.data : t)),
        };
      });
      setPendingVoteTrackId(null);
    };
    // The gateway always emits a generic { error: string } shape (see
    // apps/api/src/event/event.gateway.ts's catch blocks) - it's the only
    // feedback the client gets when a vote/join/start/add-track is rejected
    // (e.g. INVITE_ONLY licence, already voted, wrong round status), so this
    // was previously just swallowed into the console with no UI feedback at all.
    const handleSocketError = (err: unknown) => {
      console.warn('[event socket]', err);
      const message = (err as { error?: string } | null)?.error;
      if (message) notify('Error', message);
      // Whatever just failed, release the button lock so the user can retry.
      setStartingRound(false);
      setPendingVoteTrackId(null);
    };

    connectEventSocket().then((socket) => {
      if (cancelled) return;
      activeSocket = socket;

      socket.on('eventDetails', handleEventDetails);
      socket.on('eventUpdated', handleEventUpdated);
      socket.on('eventTracksUpdated', handleEventTracksUpdated);
      socket.on('eventVoteForTrack', handleEventVoteForTrack);
      socket.on('error', handleSocketError);
      socket.on('connect', () => setSocketReady(true));
      if (socket.connected) setSocketReady(true);

      // Always safe: joinRoom never requires membership, just puts this
      // client in the Socket.IO room for live broadcasts.
      emitJoinRoom(socket, id);
    });

    return () => {
      cancelled = true;
      activeSocket?.off('eventDetails', handleEventDetails);
      activeSocket?.off('eventUpdated', handleEventUpdated);
      activeSocket?.off('eventTracksUpdated', handleEventTracksUpdated);
      activeSocket?.off('eventVoteForTrack', handleEventVoteForTrack);
      activeSocket?.off('error', handleSocketError);
      activeSocket?.emit('leaveRoom', id);
      disconnectEventSocket();
    };
  }, [id, queryClient]);

  // One-time membership check: only call joinEvent (which registers DB
  // membership) if we're not already a member - the gateway throws (caught,
  // emits 'error') if you try to join twice.
  useEffect(() => {
    if (joinAttemptedRef.current || !event || currentUserId === undefined) return;
    joinAttemptedRef.current = true;

    const isMember = event.members?.some((m) => m.id === currentUserId) ?? false;
    if (!isMember) {
      connectEventSocket().then((socket) => emitJoinEvent(socket, id));
    }
  }, [event, currentUserId, id]);

  // Tick every second while a track is playing, to drive the countdown.
  useEffect(() => {
    if (event?.status !== 'PLAYING') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [event?.status]);

  // The "Start round" button unmounts once status leaves CREATED anyway, but
  // clear the lock too so it isn't stuck pre-armed if the event ever cycles
  // back through CREATED.
  useEffect(() => {
    if (event?.status !== 'CREATED') setStartingRound(false);
  }, [event?.status]);

  // Resolve the audio stream URL for the current track whenever it changes.
  useEffect(() => {
    if (!event?.currentTrackId) {
      setStreamUrl(null);
      return;
    }
    let cancelled = false;
    resolveMediaUrl(`/api/track/stream/${event.currentTrackId}`)
      .then((url) => {
        if (!cancelled) setStreamUrl(url);
      })
      .catch((err) => console.warn('Failed to resolve stream URL', err));
    return () => {
      cancelled = true;
    };
  }, [event?.currentTrackId]);

  const player = useAudioPlayer(streamUrl ?? null, { downloadFirst: true });
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (event?.status === 'PLAYING' && streamUrl && playerStatus.isLoaded && !playerStatus.playing) {
      player.play();
    }
    if (event?.status !== 'PLAYING' && playerStatus.playing) {
      player.pause();
    }
  }, [event?.status, streamUrl, playerStatus.isLoaded, playerStatus.playing, player]);

  const handleAddTrack = useCallback(
    async (track: Track) => {
      const socket = await connectEventSocket();
      emitAddTrackToEvent(socket, id, track.id);
    },
    [id]
  );

  const handleStartRound = async () => {
    setStartingRound(true);
    try {
      const socket = await connectEventSocket();
      emitStartEvent(socket, id);
    } catch (err) {
      notify('Error', 'Could not connect to the event. Please try again.');
      setStartingRound(false);
    }
  };

  const handleVote = async (trackId: string) => {
    setPendingVoteTrackId(trackId);
    try {
      const socket = await connectEventSocket();

      if (event?.licence !== 'GEOTIME') {
        emitVoteForTrack(socket, id, trackId);
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        notify('Error', 'Location permission is required to vote in this event.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      emitVoteForTrack(socket, id, trackId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      notify('Error', 'Could not connect to the event. Please try again.');
    } finally {
      setPendingVoteTrackId(null);
    }
  };

  const handleInvite = async (userId: string) => {
    try {
      await eventsApi.inviteToEvent(id, userId);
      setInviteResults((prev) => ({ ...prev, [userId]: 'sent' }));
    } catch (err) {
      setInviteResults((prev) => ({ ...prev, [userId]: err instanceof Error ? err.message : 'Could not invite.' }));
    }
  };

  const unplayedTracks = [...(event?.tracks ?? [])]
    .filter((t) => !t.played)
    .sort((a, b) => (b.votes?.length ?? 0) - (a.votes?.length ?? 0));
  const playedTracks = [...(event?.tracks ?? [])]
    .filter((t) => t.played)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const hasVotedThisRound = (track: EventTrack) =>
    track.votes?.some((v) => v.round === event?.round && v.user.id === currentUserId) ?? false;

  // The initial GET /event/:id payload names this field currentTrackStartTime
  // (raw DB column); later eventUpdated broadcasts rename it to startTime -
  // fall back so the countdown works even when you open the screen mid-round,
  // before the next round-transition broadcast arrives.
  const currentTrackStartTime = event?.startTime ?? event?.currentTrackStartTime ?? null;
  // event.currentTrack.duration is the full song length from the track's
  // source (e.g. Deezer), but playback is often just a short preview clip -
  // once the player has loaded the real audio, trust its actual duration
  // instead so the countdown matches what's actually playing.
  const trackDuration =
    playerStatus.isLoaded && playerStatus.duration > 0
      ? playerStatus.duration
      : (event?.currentTrack?.duration ?? 0);
  const remainingPlaySeconds =
    event?.status === 'PLAYING' && currentTrackStartTime && event.currentTrack
      ? Math.max(0, trackDuration - Math.floor((now - new Date(currentTrackStartTime).getTime()) / 1000))
      : 0;

  return (
    <AsyncState isLoading={eventQuery.isLoading} isError={eventQuery.isError} error={eventQuery.error}>
      {event ? (
        <ThemedView style={styles.container}>
          <ThemedText type="title">{event.title}</ThemedText>
          <ThemedText style={styles.muted}>
            by {event.createdBy.username} · round {event.round} · {socketReady ? 'live' : 'connecting…'}
          </ThemedText>

          <ThemedView style={styles.metaRow}>
            <ThemedView style={styles.metaItem}>
              <Feather name={event.privacy === 'PRIVATE' ? 'lock' : 'globe'} size={13} color={colors.icon} />
              <ThemedText style={styles.muted}>{event.privacy === 'PRIVATE' ? 'Private' : 'Public'}</ThemedText>
            </ThemedView>
            {event.licence === 'INVITE_ONLY' && (
              <ThemedView style={styles.metaItem}>
                <Feather name="mail" size={13} color={colors.icon} />
                <ThemedText style={styles.muted}>Invite only</ThemedText>
              </ThemedView>
            )}
            {event.licence === 'GEOTIME' && (
              <ThemedView style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={colors.icon} />
                <ThemedText style={styles.muted}>
                  Geofenced voting
                  {event.geoVotingStart && event.geoVotingEnd
                    ? `: ${formatEventTime(event.geoVotingStart)} – ${formatEventTime(event.geoVotingEnd)}`
                    : ''}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          <ThemedView style={[styles.statusBanner, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {event.status === 'CREATED' && (
              <ThemedText>No round started yet</ThemedText>
            )}
            {event.status === 'VOTING' && <ThemedText>Voting is open - pick your track for this round!</ThemedText>}
            {event.status === 'PLAYING' && event.currentTrack && (
              <>
                <ThemedText type="defaultSemiBold">
                  Now playing: {event.currentTrack.title} - {event.currentTrack.artist}
                </ThemedText>
                <ThemedText style={styles.muted}>{remainingPlaySeconds}s remaining</ThemedText>
                {/* <ThemedView style={styles.nowPlayingActions}>
                  <ThemedButton
                    title={playerStatus.playing ? 'Pause' : 'Play'}
                    onPress={() => (playerStatus.playing ? player.pause() : player.play())}
                    variant="secondary"
                  />
                  <ThemedButton
                    title="Lyrics"
                    onPress={() =>
                      router.push(
                        `/lyrics/${event.currentTrackId ?? ''}?title=${encodeURIComponent(
                          event.currentTrack!.title
                        )}&artist=${encodeURIComponent(event.currentTrack!.artist)}`
                      )
                    }
                    variant="secondary"
                  />
                </ThemedView> */}
              </>
            )}
            {event.status === 'FINISHED' && <ThemedText>Event finished - every track has been played.</ThemedText>}
          </ThemedView>

          <ThemedText style={styles.muted}>
            {(event.members?.length ?? 0)} member{(event.members?.length ?? 0) === 1 ? '' : 's'}
            {event.members?.some((m) => m.isOnline)
              ? ` (${event.members.filter((m) => m.isOnline).length} online)`
              : ''}
          </ThemedText>

          <ThemedView style={styles.actionsRow}>
            <ThemedButton
              title="Add track"
              onPress={() => setShowTrackSearch(true)}
              variant="secondary"
              style={styles.actionButton}
            />
            {currentUserId === event.createdById && event.status === 'CREATED' && unplayedTracks.length > 0 ? (
              <ThemedButton title="Start round" onPress={handleStartRound} loading={startingRound} style={styles.actionButton} />
            ) : null}
            {currentUserId === event.createdById ? (
              <ThemedButton title="Invite" onPress={() => setShowInvite((v) => !v)} variant="secondary" style={styles.actionButton} />
            ) : null}
          </ThemedView>

          {showInvite && (
            <ThemedView style={styles.inviteBox}>
              <ThemedTextInput
                placeholder="Search a username to invite"
                value={inviteQuery}
                onChangeText={setInviteQuery}
                autoCapitalize="none"
              />
              {(searchQuery.data ?? []).map((user) => {
                const result = inviteResults[user.id];
                const sent = result === 'sent';
                return (
                  <ThemedView key={user.id} style={[styles.inviteResultRow, { borderColor: colors.border }]}>
                    <ThemedView style={styles.inviteResultText}>
                      <ThemedText>{user.username}</ThemedText>
                      {result && !sent ? <ThemedText style={styles.error}>{result}</ThemedText> : null}
                    </ThemedView>
                    <Pressable
                      onPress={() => handleInvite(user.id)}
                      disabled={sent}
                      style={styles.inviteSendButton}
                      hitSlop={8}>
                      <Feather name={sent ? 'check' : 'user-plus'} size={18} color={sent ? colors.icon : colors.tint} />
                    </Pressable>
                  </ThemedView>
                );
              })}
            </ThemedView>
          )}

          <FlatList
            data={unplayedTracks}
            keyExtractor={(item) => item.trackId}
            ListHeaderComponent={
              unplayedTracks.length > 0 ? <ThemedText type="defaultSemiBold">Up next</ThemedText> : null
            }
            renderItem={({ item }) => (
              <ThemedView style={[styles.trackRow, { borderColor: colors.border }]}>
                {item.track?.imageUrl ? (
                  <Image source={{ uri: item.track.imageUrl }} style={styles.trackImage} />
                ) : (
                  <ThemedView style={[styles.trackImage, styles.trackImagePlaceholder, { borderColor: colors.border }]}>
                    <Feather name="music" size={16} color={colors.icon} />
                  </ThemedView>
                )}
                <ThemedView style={styles.trackInfo}>
                  <ThemedText type="defaultSemiBold">{item.track?.title}</ThemedText>
                  <ThemedText style={styles.muted}>{item.track?.artist}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.voteBox}>
                  <ThemedText type="defaultSemiBold">{item.votes?.length ?? 0}</ThemedText>
                  <ThemedButton
                    title={hasVotedThisRound(item) ? 'Voted' : 'Vote'}
                    onPress={() => handleVote(item.trackId)}
                    variant="secondary"
                    loading={pendingVoteTrackId === item.trackId}
                    disabled={event.status !== 'VOTING' || hasVotedThisRound(item)}
                    style={styles.actionButton}
                  />
                </ThemedView>
              </ThemedView>
            )}
            ListEmptyComponent={<ThemedText style={styles.muted}>No tracks yet.</ThemedText>}
            ListFooterComponent={
              playedTracks.length > 0 ? (
                <ThemedView style={styles.playedSection}>
                  <ThemedText type="defaultSemiBold">Already played</ThemedText>
                  {playedTracks.map((item) => (
                    <ThemedText key={item.trackId} style={styles.muted}>
                      {item.track?.title} - {item.track?.artist}
                    </ThemedText>
                  ))}
                </ThemedView>
              ) : null
            }
          />

          <TrackSearchSheet visible={showTrackSearch} onClose={() => setShowTrackSearch(false)} onSelectTrack={handleAddTrack} />
        </ThemedView>
      ) : null}
    </AsyncState>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 10,
  },
  muted: {
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  nowPlayingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 16,
  },
  inviteBox: {
    gap: 8,
  },
  inviteResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteResultText: {
    flex: 1,
    gap: 2,
  },
  inviteSendButton: {
    padding: 4,
  },
  error: {
    color: '#ff4d4d',
    fontSize: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
  voteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playedSection: {
    marginTop: 12,
    gap: 4,
  },
});
