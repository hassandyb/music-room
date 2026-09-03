import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as playlistsApi from '@/lib/api/playlists';
import { notify } from '@/lib/platform-alert';

export default function PlaylistMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const { data: playlist } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistsApi.getPlaylistPreview(id),
  });
  const membersQuery = useQuery({
    queryKey: ['playlist', id, 'members'],
    queryFn: () => playlistsApi.getMembers(id),
  });

  const kickMutation = useMutation({
    mutationFn: (userId: string) => playlistsApi.kickMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    },
    onError: (err) => notify('Error', err instanceof Error ? err.message : 'Could not remove member.'),
  });

  return (
    <AsyncState isLoading={membersQuery.isLoading} isError={membersQuery.isError} error={membersQuery.error}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Members</ThemedText>
          {playlist?.isOwner && (
            <ThemedButton title="Invite a friend" onPress={() => router.push(`/playlists/${id}/invite`)} variant="secondary" />
          )}

          <AsyncState
            isLoading={false}
            isError={false}
            isEmpty={(membersQuery.data ?? []).length === 0}
            emptyMessage="No members yet.">
            {(membersQuery.data ?? []).map((member) => {
              const isOwner = member.id === playlist?.ownerId;
              return (
                <ThemedView key={member.id} style={[styles.row, { borderColor: colors.border }]}>
                  <ThemedText>
                    {member.username}
                    {isOwner ? ' · Owner' : ''}
                  </ThemedText>
                  {playlist?.isOwner && !isOwner && (
                    <ThemedButton
                      title="Remove"
                      onPress={() => kickMutation.mutate(member.id)}
                      loading={kickMutation.isPending && kickMutation.variables === member.id}
                      variant="ghost"
                    />
                  )}
                </ThemedView>
              );
            })}
          </AsyncState>
        </ThemedView>
      </ScrollView>
    </AsyncState>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
