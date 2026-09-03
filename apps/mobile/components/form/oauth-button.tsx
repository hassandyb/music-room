import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { notify } from '@/lib/platform-alert';
import type { OAuthProvider } from '@/lib/api/oauth';

type Props = {
  provider: OAuthProvider;
  label: string;
  // Present (and true/false) only on the profile screen's "Linked accounts"
  // section, where the same button links a provider instead of signing in.
  connected?: boolean;
};

export function OAuthButton({ provider, label, connected }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { state, loginWithOAuth, linkOAuthAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const isLinking = state.status === 'authenticated';

  const handlePress = async () => {
    setLoading(true);
    try {
      if (isLinking) {
        await linkOAuthAccount(provider);
        // The Profile screen reads googleId/facebookId from its own
        // ['profile'] query cache, not from AuthContext — refreshSession()
        // inside linkOAuthAccount only updates AuthContext, so this cache
        // needs its own nudge or the "Connected" label never updates.
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        await loginWithOAuth(provider);
      }
    } catch (err) {
      notify('Sign-in failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed || loading ? 0.85 : 1 },
      ]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {isLinking ? (
        <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>{connected ? 'Connected' : 'Connect'}</ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
