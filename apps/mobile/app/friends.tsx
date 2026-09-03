import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as usersApi from '@/lib/api/users';
import * as friendsApi from '@/lib/api/friends';
import { ApiError } from '@/lib/api-client';
import { notify } from '@/lib/platform-alert';


import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url';


function FriendAvatar({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const resolvedUrl = useResolvedMediaUrl(avatarUrl);

  return resolvedUrl ? (
    <Image source={{ uri: resolvedUrl }} style={styles.avatar} contentFit="cover" />
  ) : (
    <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { borderColor: colors.border }]}>
      <Feather name="user" size={16} color={colors.icon} />
    </ThemedView>
  );
}


export default function FriendsScreen() {
  const { state } = useAuth();
  const currentUserId = state.status === 'authenticated' ? state.user.id : undefined;
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const friendsQuery = useQuery({ queryKey: ['friends'], queryFn: friendsApi.listFriends });
  const incomingQuery = useQuery({ queryKey: ['friends', 'requests', 'incoming'], queryFn: friendsApi.listIncomingRequests });
  const sentQuery = useQuery({ queryKey: ['friends', 'requests', 'sent'], queryFn: friendsApi.listSentRequests });
  const searchQuery = useQuery({
    queryKey: ['users-search', debounced],
    queryFn: () => usersApi.searchUsers(debounced),
    enabled: debounced.length > 0,
  });

  const friendIds = new Set((friendsQuery.data ?? []).map((f) => f.id));
  const sentRequestIds = new Set((sentQuery.data ?? []).map((r) => r.receiverId));
  const incomingByUserId = new Map((incomingQuery.data ?? []).map((r) => [r.senderId, r]));
  const results = (searchQuery.data ?? []).filter((u) => u.id !== currentUserId);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
  };

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setPending(key);
    try {
      await action();
      invalidateAll();
    } catch (err) {
      notify('Error', err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setPending(null);
    }
  };

  const handleSend = (userId: string) => runAction(userId, () => friendsApi.sendFriendRequest(userId));
  const handleAccept = (requestId: string) => runAction(requestId, () => friendsApi.acceptFriendRequest(requestId));
  const handleReject = (requestId: string) => runAction(requestId, () => friendsApi.rejectFriendRequest(requestId));
  const handleRemove = (userId: string) => runAction(userId, () => friendsApi.removeFriend(userId));

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedTextInput
          placeholder="Search by username or email"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {debounced.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">Results</ThemedText>
            <AsyncState
              isLoading={searchQuery.isLoading}
              isError={searchQuery.isError}
              isEmpty={results.length === 0}
              emptyMessage={`No results for "${debounced}"`}>
              {results.map((user) => {
                const incoming = incomingByUserId.get(user.id);
                const isFriend = friendIds.has(user.id);
                const isSent = sentRequestIds.has(user.id);
                return (
                  <ThemedView key={user.id} style={[styles.row, { borderColor: colors.border }]}>
                    <ThemedText>{user.username}</ThemedText>
                    {isFriend ? (
                      <ThemedText style={styles.muted}>Friends</ThemedText>
                    ) : incoming ? (
                      <ThemedButton title="Accept" onPress={() => handleAccept(incoming.id)} loading={pending === incoming.id} variant="secondary" />
                    ) : isSent ? (
                      <ThemedText style={styles.muted}>Requested</ThemedText>
                    ) : (
                      <ThemedButton title="Add" onPress={() => handleSend(user.id)} loading={pending === user.id} variant="secondary" style={{ paddingHorizontal: 16 }} />
                    )}
                  </ThemedView>
                );
              })}
            </AsyncState>
          </ThemedView>
        )}

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold">Friend requests</ThemedText>
          <AsyncState
            isLoading={incomingQuery.isLoading}
            isError={incomingQuery.isError}
            isEmpty={(incomingQuery.data ?? []).length === 0}
            emptyMessage="No pending requests.">
            {(incomingQuery.data ?? []).map((request) => (
              <ThemedView key={request.id} style={[styles.row, { borderColor: colors.border }]}>
                <ThemedText>{request.senderUsername}</ThemedText>
                <ThemedView style={styles.rowActions}>
                  <ThemedButton title="Accept" onPress={() => handleAccept(request.id)} loading={pending === request.id} variant="secondary" style={{ paddingHorizontal: 16 }} />
                  <ThemedButton title="Reject" onPress={() => handleReject(request.id)} loading={pending === request.id} variant="secondary" style={{ paddingHorizontal: 16 }} />
                </ThemedView>
              </ThemedView>
            ))}
          </AsyncState>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold">Your friends</ThemedText>
          <AsyncState
            isLoading={friendsQuery.isLoading}
            isError={friendsQuery.isError}
            isEmpty={(friendsQuery.data ?? []).length === 0}
            emptyMessage="No friends yet.">
            {(friendsQuery.data ?? []).map((friend) => (
              <ThemedView key={friend.id} style={[styles.row, { borderColor: colors.border }]}>
                <ThemedView style={styles.friendInfo}>
                  <FriendAvatar avatarUrl={friend.profile?.avatarUrl} />
                  <ThemedText>{friend.username}</ThemedText>
                </ThemedView>
                <ThemedButton title="Remove" onPress={() => handleRemove(friend.id)} loading={pending === friend.id} variant="ghost" />
              </ThemedView>
            ))}
          </AsyncState>
        </ThemedView>
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
    gap: 16,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  muted: {
    opacity: 0.6,
  },
  friendInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},
avatar: {
  width: 36,
  height: 36,
  borderRadius: 18,
},
avatarPlaceholder: {
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

});
