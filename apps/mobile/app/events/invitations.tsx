import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as eventsApi from '@/lib/api/events';
import { notify } from '@/lib/platform-alert';

export default function EventInvitationsScreen() {
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['event-invitations'],
    queryFn: eventsApi.getMyInvitations,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-invitations'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) => eventsApi.acceptInvitation(invitationId),
    onSuccess: (_, invitationId) => {
      invalidate();
      const accepted = data?.find((inv) => inv.id === invitationId);
      if (accepted) router.push(`/events/${accepted.eventId}`);
    },
    onError: (err) => notify('Error', err instanceof Error ? err.message : 'Could not accept invitation.'),
    onSettled: () => setPending(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (invitationId: string) => eventsApi.rejectInvitation(invitationId),
    onSuccess: invalidate,
    onError: (err) => notify('Error', err instanceof Error ? err.message : 'Could not reject invitation.'),
    onSettled: () => setPending(null),
  });

  return (
    <AsyncState isLoading={isLoading} isError={isError} error={error}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Invitations</ThemedText>

          <AsyncState
            isLoading={false}
            isError={false}
            isEmpty={(data ?? []).length === 0}
            emptyMessage="No pending event invitations.">
            {(data ?? []).map((invitation) => (
              <ThemedView key={invitation.id} style={[styles.row, { borderColor: colors.border }]}>
                <ThemedView style={styles.rowText}>
                  <ThemedText type="defaultSemiBold">{invitation.eventName}</ThemedText>
                  <ThemedText style={styles.muted}>from {invitation.creatorUsername}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.actions}>
                  <ThemedButton
                    title="Accept"
                    onPress={() => {
                      setPending(invitation.id);
                      acceptMutation.mutate(invitation.id);
                    }}
                    loading={pending === invitation.id && acceptMutation.isPending}
                    style={{ paddingHorizontal: 16 }}
                  />
                  <ThemedButton
                    title="Reject"
                    onPress={() => {
                      setPending(invitation.id);
                      rejectMutation.mutate(invitation.id);
                    }}
                    loading={pending === invitation.id && rejectMutation.isPending}
                    variant="secondary"
                    style={{ paddingHorizontal: 16 }}
                  />
                </ThemedView>
              </ThemedView>
            ))}
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
