import { ScrollView, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function VerifyEmailPendingScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
    <ThemedView style={styles.container}>
      <ThemedText type="title">Check your email</ThemedText>
      <ThemedText style={styles.body}>
        We sent a verification link to{email ? ` ${email}` : ' your inbox'}. Open it to activate your account, then
        come back and log in.
      </ThemedText>

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
