import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { GoogleButton } from '@/components/form/google-button';
import { FacebookButton } from '@/components/form/facebook-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <View style={styles.brandRow}>
        <View>
          <ThemedText type="defaultSemiBold" style={styles.brandText}>
            Music <Text style={{ color: colors.tint }}>Room</Text>
          </ThemedText>
          <ThemedText style={[styles.brandSubtext, { color: colors.icon }]}>
            Collaborative music platform
          </ThemedText>
        </View>
      </View>

      <ThemedText type="title">Welcome back</ThemedText>

      <ThemedTextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <ThemedTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <ThemedButton title="Log in" onPress={handleSubmit} loading={loading} />

      <Link href="/(auth)/forgot-password" style={styles.link}>
        <ThemedText type="link">Forgot password?</ThemedText>
      </Link>

      <GoogleButton />
      {/* <FacebookButton /> */}

      <ThemedText style={styles.footer}>
        {"Don't have an account? "}
        <Link href="/(auth)/register">
          <ThemedText type="link">Create one</ThemedText>
        </Link>
      </ThemedText>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 15,
  },
  brandSubtext: {
    fontSize: 11,
  },
  error: {
    color: '#ff4d4d',
  },
  link: {
    alignSelf: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: 8,
  },
});
