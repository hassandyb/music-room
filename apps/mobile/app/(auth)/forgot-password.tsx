import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import * as authApi from '@/lib/api/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
    } catch {
      // Don't reveal whether the email exists - show the same confirmation either way.
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <ThemedText type="title">Forgot password</ThemedText>

      {submitted ? (
        <ThemedText style={styles.body}>
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </ThemedText>
      ) : (
        <>
          <ThemedTextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <ThemedButton title="Send reset link" onPress={handleSubmit} loading={loading} />
        </>
      )}

      {/* <Link href="/(auth)/reset-password" style={styles.link}>
        <ThemedText type="link">I already have a reset code</ThemedText>
      </Link> */}
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
