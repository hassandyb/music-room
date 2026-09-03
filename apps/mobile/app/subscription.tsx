import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as profileApi from '@/lib/api/profile';
import { useAuth } from '@/context/auth-context';

const PREMIUM_FEATURES = [
  'Unlimited playlist creation',
  'High-quality audio streaming',
  'Priority track voting weight',
  'Early access to new features',
];

// PATCH /api/profile/subscription persists the tier server-side (Profile.subscription
// in the DB) - there's still no real billing/payment processing behind it, but
// unlike other profile edits (PUT /api/profile is a stub, see lib/api/profile.ts),
// this one is a genuine, non-local change.
export default function SubscriptionScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  const [changing, setChanging] = useState(false);

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  });

  const isPremium = user?.profile?.subscription === 'PREMIUM';

  const handleChange = async (target: 'FREE' | 'PREMIUM') => {
    setChanging(true);
    try {
      await profileApi.updateSubscription(target);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      // AuthContext's user (read by invite.tsx's isPremium() check) only ever
      // gets set at login/register/OAuth/bootstrap - refresh it here too, or
      // the premium gate keeps enforcing the stale tier until next login.
      await refreshSession();
    } finally {
      setChanging(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <AsyncState isLoading={isLoading} isError={isError} error={error}>
          <View style={[styles.hero, { borderColor: colors.tint, backgroundColor: `${colors.tint}14` }]}>
            <IconSymbol name="crown.fill" size={28} color={colors.tint} />
            <ThemedText type="title" style={styles.heroTitle}>
              {isPremium ? 'Premium Member' : 'Go Premium'}
            </ThemedText>
            <ThemedText style={[styles.heroSubtitle, { color: colors.icon }]}>
              {isPremium ? 'You have full access to every feature.' : 'Unlock exclusive features'}
            </ThemedText>
          </View>

          <View style={styles.features}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <IconSymbol name="checkmark.circle.fill" size={18} color={colors.tint} />
                <ThemedText>{feature}</ThemedText>
              </View>
            ))}
          </View>

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <ThemedText type="defaultSemiBold">Current plan</ThemedText>
            <ThemedText type="defaultSemiBold" style={[styles.planValue, { color: colors.tint }]}>
              {user?.profile?.subscription ?? 'FREE'}
            </ThemedText>
          </View>

          {isPremium ? (
            <ThemedButton
              title="Downgrade to Free"
              onPress={() => handleChange('FREE')}
              loading={changing}
              variant="secondary"
            />
          ) : (
            <ThemedButton title="Upgrade Now" onPress={() => handleChange('PREMIUM')} loading={changing} />
          )}

          <ThemedText style={[styles.note, { color: colors.icon }]}>
            {"There's no real billing wired up yet - your plan is saved, but nothing is actually charged."}
          </ThemedText>
        </AsyncState>
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
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  features: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  planValue: {
    fontSize: 22,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
