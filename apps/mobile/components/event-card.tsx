import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Event } from '@/lib/types';

// Mirrors apps/web/app/(dashboard)/events/page.tsx's EventCard: same fields,
// same badge logic, adapted to a single-column RN card.
export function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const isLive = event.status === 'VOTING' || event.status === 'PLAYING';
  const visibleTracks = (event.tracks ?? []).slice(0, 5);
  const overflowCount = (event.tracks?.length ?? 0) - visibleTracks.length;
  const hasLocation = typeof event.latitude === 'number' && typeof event.longitude === 'number';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <ThemedView style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.artHeader, { borderColor: colors.border }]}>
          <IconSymbol name="waveform" size={28} color={`${colors.tint}99`} />

          <View style={styles.badgeStack}>
            {isLive ? (
              <View style={[styles.liveBadge, { borderColor: `${colors.tint}4d` }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.tint }]} />
                <ThemedText type="defaultSemiBold" style={[styles.liveBadgeText, { color: colors.tint }]}>Live</ThemedText>
              </View>
            ) : null}
            {event.round > 0 ? (
              <View style={[styles.roundBadge, { borderColor: colors.border }]}>
                <ThemedText style={styles.roundBadgeText}>Round {event.round}</ThemedText>
              </View>
            ) : null}
          </View>

          {isLive && event.currentTrack ? (
            <View style={styles.nowPlayingStrip}>
              <ThemedText style={styles.nowPlayingText} numberOfLines={1}>
                <ThemedText style={{ color: colors.tint, fontSize: 10 }}>Now </ThemedText>
                {event.currentTrack.title}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
            {event.title}
          </ThemedText>

          <View style={styles.byRow}>
            <IconSymbol name="person.fill" size={11} color={colors.icon} />
            <ThemedText style={[styles.byText, { color: colors.icon }]} numberOfLines={1}>
              {event.createdBy.username}
            </ThemedText>
            {hasLocation ? <IconSymbol name="mappin.circle.fill" size={12} color={colors.icon} /> : null}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.pill,
                  event.privacy === 'PUBLIC'
                    ? { backgroundColor: '#0d1a0d', borderColor: '#1a2e1a' }
                    : { backgroundColor: '#1a0d0d', borderColor: '#2e1a1a' },
                ]}>
                <ThemedText type="defaultSemiBold" style={[styles.pillText, { color: event.privacy === 'PUBLIC' ? '#3a7a3a' : '#7a3a3a' }]}>
                  {event.privacy}
                </ThemedText>
              </View>
              <View style={[styles.pill, { borderColor: colors.border }]}>
                <ThemedText type="defaultSemiBold" style={[styles.pillText, { color: colors.icon }]}>{event.licence}</ThemedText>
              </View>
            </View>

            {visibleTracks.length > 0 ? (
              <View style={styles.avatarStack}>
                {visibleTracks.map((track, i) => (
                  <View
                    key={track.trackId}
                    style={[
                      styles.avatar,
                      {
                        borderColor: colors.surface,
                        backgroundColor: colors.border,
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: visibleTracks.length - i,
                      },
                    ]}>
                    {track.track?.imageUrl ? (
                      <Image source={{ uri: track.track.imageUrl }} style={styles.avatarImage} />
                    ) : (
                      <IconSymbol name="music.note" size={11} color={colors.icon} />
                    )}
                  </View>
                ))}
                {overflowCount > 0 ? (
                  <View style={[styles.avatar, { borderColor: colors.surface, backgroundColor: colors.border, marginLeft: -8 }]}>
                    <ThemedText style={styles.overflowText}>+{overflowCount}</ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  artHeader: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,77,0,0.06)',
  },
  badgeStack: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,77,0,0.15)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
  },
  roundBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  roundBadgeText: {
    fontSize: 10,
    opacity: 0.7,
  },
  nowPlayingStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nowPlayingText: {
    fontSize: 10,
  },
  content: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 15,
  },
  byRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  byText: {
    fontSize: 12,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  overflowText: {
    fontSize: 9,
    opacity: 0.7,
  },
});
