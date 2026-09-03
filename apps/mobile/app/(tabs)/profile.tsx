import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedSafeView } from '@/components/themed-safe-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/form/themed-button';
import { GoogleButton } from '@/components/form/google-button';
import { FacebookButton } from '@/components/form/facebook-button';
import { AsyncState } from '@/components/async-state';
import { useAuth } from '@/context/auth-context';
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url';
import * as profileApi from '@/lib/api/profile';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/context/theme-preference-context';

function MenuButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.menuButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: loading ? 0.5 : 1 }]}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <Feather name="chevron-right" size={18} color={colors.icon} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { effectiveScheme, setPreference } = useThemePreference();
  const toggleTheme = () => setPreference(effectiveScheme === 'dark' ? 'light' : 'dark');

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  });

  const avatarUrl = useResolvedMediaUrl(user?.profile?.avatarUrl);

  return (
    <ThemedSafeView>
    <ThemedView style={styles.topBar}>
      <Pressable
        onPress={toggleTheme}
        hitSlop={8}
        style={[styles.themeToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Feather name={effectiveScheme === 'dark' ? 'moon' : 'sun'} size={22} color={colors.text} />
      </Pressable>
    </ThemedView>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <AsyncState isLoading={isLoading} isError={isError} error={error}>
          {user && !user.profile ? (
            <ThemedView style={styles.center}>
              <ThemedText type="title">Set up your profile</ThemedText>
              <ThemedText style={styles.muted}>Add your name, location and music taste.</ThemedText>
              <ThemedButton title="Create profile" onPress={() => router.push('/profile/create')} />
              <ThemedButton title="Log out" onPress={logout} variant="ghost" />
            </ThemedView>
          ) : user ? (
            <>
              <ThemedView style={styles.header}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]} />
                )}
                <ThemedText type="title">
                  {user.profile?.firstName} {user.profile?.lastName}
                </ThemedText>
                <ThemedText style={styles.muted}>@{user.username}</ThemedText>
                <Pressable onPress={() => router.push('/subscription')}>
                  <ThemedView style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ThemedText type="defaultSemiBold" style={styles.badgeText}>{user.profile?.subscription ?? 'FREE'}</ThemedText>
                  </ThemedView>
                </Pressable>
              </ThemedView>

              <MenuButton title="Edit profile" onPress={() => router.push('/profile/edit')} />
              <MenuButton title="Friends" onPress={() => router.push('/friends')} />
              <MenuButton title="Manage subscription" onPress={() => router.push('/subscription')} />

              <ThemedView style={styles.section}>
                <ThemedText type="defaultSemiBold">Linked accounts</ThemedText>
                <GoogleButton connected={!!user.googleId} />
                {/* <FacebookButton connected={!!user.facebookId} /> */}
              </ThemedView>

              <MenuButton title="Log out" onPress={logout} />
            </>
          ) : null}
        </AsyncState>
      </ThemedView>
    </ScrollView>
    </ThemedSafeView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 24,
    paddingTop: 20,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  container: {
    padding: 24,
    gap: 14,
  },
  center: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    borderWidth: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  section: {
    gap: 4,
  },
  muted: {
    opacity: 0.7,
  },
});
