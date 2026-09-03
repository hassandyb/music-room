import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedSafeView } from '@/components/themed-safe-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { EventCard } from '@/components/event-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as eventsApi from '@/lib/api/events';

// Mirrors apps/web/app/(dashboard)/events/page.tsx: same header copy, search
// box, "Create Event" button and empty state, adapted to a single-column list.
export default function EventsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.listEvents,
  });

  const invitationsQuery = useQuery({ queryKey: ['event-invitations'], queryFn: eventsApi.getMyInvitations });
  const invitationCount = invitationsQuery.data?.length ?? 0;

  const filteredEvents = useMemo(() => {
    const events = data ?? [];
    if (!search.trim()) return events;
    const q = search.trim().toLowerCase();
    return events.filter((e) => e.title.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <ThemedSafeView style={styles.container}>
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.titleText}>
            Music <Text style={{ color: colors.tint }}>Events</Text>
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            Discover and join live music events
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/events/create')}
          style={[styles.createButton, { backgroundColor: colors.tint }]}>
          <IconSymbol name="plus" size={16} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.createButtonText}>Create Event</ThemedText>
        </Pressable>
      </View>

      {/* <View style={styles.searchRow}>
        <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.icon} />
          <ThemedTextInput
            placeholder="Search events...----"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
      </View> */}

      <ThemedButton
        title={invitationCount > 0 ? `Invitations (${invitationCount})` : 'Invitations'}
        onPress={() => router.push('/events/invitations')}
        variant="secondary"
      />

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={filteredEvents.length === 0}
        emptyMessage={
          (data ?? []).length === 0
            ? 'No events yet - create your first music event and start sharing the rhythm.'
            : 'No events match your search.'
        }>
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <EventCard event={item} onPress={() => router.push(`/events/${item.id}`)} />}
        />
      </AsyncState>
    </ThemedSafeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleText: {
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
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
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
});
