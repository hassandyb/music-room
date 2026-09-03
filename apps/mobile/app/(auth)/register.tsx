import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { GoogleButton } from '@/components/form/google-button';
import { FacebookButton } from '@/components/form/facebook-button';
import * as authApi from '@/lib/api/auth';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!email.trim() || !username.trim() || !password || !confirmation) return 'Fill in every field.';
    if (username.trim().length < 3 || username.trim().length > 20) return 'Username must be 3-20 characters.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmation) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.register({
        email: email.trim(),
        username: username.trim(),
        password,
        passwordConfirmation: confirmation,
      });
      router.replace({ pathname: '/(auth)/verify-email-pending', params: { email: email.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Create your account</ThemedText>

        <ThemedTextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <ThemedTextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ThemedTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <ThemedTextInput
          placeholder="Confirm password"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <ThemedButton title="Create account" onPress={handleSubmit} loading={loading} />

        <GoogleButton />
        {/* <FacebookButton /> */}

        <ThemedText style={styles.footer}>
          Already have an account?{' '}
          <Link href="/(auth)/login">
            <ThemedText type="link">Log in</ThemedText>
          </Link>
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    padding: 24,
    gap: 14,
  },
  error: {
    color: '#ff4d4d',
  },
  footer: {
    textAlign: 'center',
    marginTop: 8,
  },
});
