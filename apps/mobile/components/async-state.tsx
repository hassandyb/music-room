import { ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Props = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  style?: ViewStyle;
  children: ReactNode;
};

export function AsyncState({ isLoading, isError, error, isEmpty, emptyMessage, style, children }: Props) {
  if (isLoading) {
    return (
      <ThemedView style={[styles.center, style]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={[styles.center, style]}>
        <ThemedText style={styles.message}>
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (isEmpty) {
    return (
      <ThemedView style={[styles.center, style]}>
        <ThemedText style={styles.message}>{emptyMessage ?? 'Nothing here yet.'}</ThemedText>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    textAlign: 'center',
    opacity: 0.8,
  },
});
