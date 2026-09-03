import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import * as profileApi from '@/lib/api/profile';

export default function CreateProfileScreen() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [genres, setGenres] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !location.trim()) {
      setError('First name, last name and location are required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await profileApi.createProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        location: location.trim(),
        genres: genres.trim(),
        avatarUri,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Auth state (and the redirect guard in app/_layout.tsx) reads
      // user.profile from AuthContext, not the query cache - refresh it so
      // the app knows onboarding is done before navigating away.
      await refreshSession();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { borderColor: colors.border }]}>
              <ThemedText style={styles.muted}>Add photo</ThemedText>
            </ThemedView>
          )}
        </Pressable>

        <ThemedTextInput placeholder="First name" value={firstName} onChangeText={setFirstName} />
        <ThemedTextInput placeholder="Last name" value={lastName} onChangeText={setLastName} />
        <ThemedTextInput placeholder="Location (e.g. Marrakech, Morocco)" value={location} onChangeText={setLocation} />
        <ThemedTextInput
          placeholder="Favorite genres (e.g. rock, jazz, pop)"
          value={genres}
          onChangeText={setGenres}
          autoCapitalize="none"
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <ThemedButton title="Save profile" onPress={handleSubmit} loading={loading} />
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
    gap: 14,
  },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    opacity: 0.6,
    fontSize: 12,
  },
  error: {
    color: '#ff4d4d',
  },
});
