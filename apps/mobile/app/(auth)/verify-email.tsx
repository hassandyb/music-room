import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import * as authApi from '@/lib/api/auth';

// Defensive/optional screen: the primary email-verification path is simply
// opening the emailed backend link (GET /api/auth/verify-email?token=...)
// directly in a browser - the app doesn't know the backend's public origin a
// recipient's mail client would use, so no deep-link scheme registration is
// required to satisfy the subject. This screen only helps if a link is ever
// opened while the app itself is running and gets intercepted as a deep link.
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in this link.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      {status === 'checking' && <ActivityIndicator />}
      {status === 'success' && <ThemedText type="title">Email verified!</ThemedText>}
      {status === 'error' && (
        <>
          <ThemedText type="title">Verification failed</ThemedText>
          <ThemedText style={styles.body}>{message}</ThemedText>
        </>
      )}

      <Link href="/(auth)/login" style={styles.link}>
        <ThemedText type="link">Go to login</ThemedText>
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
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  body: {
    textAlign: 'center',
    opacity: 0.8,
  },
  link: {
    marginTop: 8,
  },
});
