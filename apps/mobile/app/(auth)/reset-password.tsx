import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import * as authApi from '@/lib/api/auth';

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(tokenParam ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim() || !password || !confirmPassword) {
      setError('Fill in every field.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ token: token.trim(), password, confirmPassword });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <ThemedText type="title">Reset password</ThemedText>
      <ThemedText style={styles.body}>Paste the reset code from your email, then choose a new password.</ThemedText>

      <ThemedTextInput
        placeholder="Reset code"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ThemedTextInput placeholder="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <ThemedTextInput
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <ThemedButton title="Reset password" onPress={handleSubmit} loading={loading} />

      <Link href="/(auth)/login" style={styles.link}>
        <ThemedText type="link">Back to login</ThemedText>
      </Link>
    </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  body: {
    opacity: 0.8,
  },
  error: {
    color: '#ff4d4d',
  },
  link: {
    alignSelf: 'center',
  },
});
