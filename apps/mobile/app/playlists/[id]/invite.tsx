import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import * as playlistsApi from '@/lib/api/playlists';
import * as usersApi from '@/lib/api/users';
import { ApiError } from '@/lib/api-client';
import { isPremium } from '@/lib/premium';

export default function InvitePlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const user = state.status === 'authenticated' ? state.user : null;
  const premium = isPremium(user);

  const searchQuery = useQuery({
    queryKey: ['users-search', debounced],
    queryFn: () => usersApi.searchUsers(debounced),
    enabled: premium && debounced.length > 0,
  });

  const handleInvite = async (userId: string) => {
    setPending(userId);
    try {
      await playlistsApi.inviteToPlaylist(id, userId);
      setResults((prev) => ({ ...prev, [userId]: 'sent' }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [userId]: err instanceof ApiError ? err.message : 'Could not invite.' }));
    } finally {
      setPending(null);
    }
  };

  if (!premium) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Invite a friend</ThemedText>
        <ThemedText style={styles.muted}>
          Inviting collaborators requires Premium - upgrade to let friends co-edit your playlists.
        </ThemedText>
        <ThemedButton title="View Premium" onPress={() => router.push('/subscription')} />
      </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <ThemedText type="title">Invite a friend</ThemedText>
      <ThemedText style={styles.muted}>Only accepted friends can be invited to collaborate.</ThemedText>
      <ThemedTextInput placeholder="Search a username" value={query} onChangeText={setQuery} autoCapitalize="none" />

      <AsyncState
        isLoading={debounced.length > 0 && searchQuery.isLoading}
        isError={searchQuery.isError}
        isEmpty={debounced.length > 0 && (searchQuery.data ?? []).length === 0}
        emptyMessage={debounced.length > 0 ? `No users found for "${debounced}"` : 'Start typing a username to search.'}>
        {(searchQuery.data ?? [])
          .filter((candidate) => candidate.id !== user?.id)
          .map((candidate) => {
            const result = results[candidate.id];
            const sent = result === 'sent';
            return (
              <ThemedView key={candidate.id} style={[styles.row, { borderColor: colors.border }]}>
                <ThemedView style={styles.rowText}>
                  <ThemedText>{candidate.username}</ThemedText>
                  {result && !sent ? <ThemedText style={styles.error}>{result}</ThemedText> : null}
                </ThemedView>
                <ThemedButton
                  title={sent ? 'Invited' : 'Invite'}
                  onPress={() => handleInvite(candidate.id)}
                  loading={pending === candidate.id}
                  disabled={sent}
                  variant={sent ? 'ghost' : 'secondary'}
                  style={styles.inviteButton}
                />
              </ThemedView>
            );
          })}
      </AsyncState>
    </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  inviteButton: {
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  muted: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: '#ff4d4d',
    fontSize: 12,
  },
});
