import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { AsyncState } from '@/components/async-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url';
import * as profileApi from '@/lib/api/profile';

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { data: user, isLoading, isError, error } = useQuery({ queryKey: ['profile'], queryFn: profileApi.getProfile });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [searchPreferences, setSearchPreferences] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error2, setError2] = useState<string | null>(null);

  const currentAvatarUrl = useResolvedMediaUrl(user?.profile?.avatarUrl);

  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.firstName ?? '');
      setLastName(user.profile.lastName ?? '');
      setSearchPreferences(user.profile.searchPreference ?? '');
    }
  }, [user]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError2('Photo library access is needed to change your photo.');
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
    setSaving(true);
    setSaved(false);
    setError2(null);
    try {
      await profileApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        searchPreferences: searchPreferences.trim(),
        avatarUri,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setAvatarUri(undefined);
      setSaved(true);
    } catch (err) {
      setError2(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <AsyncState isLoading={isLoading} isError={isError} error={error}>
          <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
            {avatarUri || currentAvatarUrl ? (
              <Image source={{ uri: avatarUri ?? currentAvatarUrl }} style={styles.avatar} />
            ) : (
              <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { borderColor: colors.border }]}>
                <ThemedText style={styles.muted}>Add photo</ThemedText>
              </ThemedView>
            )}
            <ThemedText style={[styles.changePhoto, { color: colors.tint }]}>Change photo</ThemedText>
          </Pressable>

          <ThemedTextInput placeholder="First name" value={firstName} onChangeText={setFirstName} />
          <ThemedTextInput placeholder="Last name" value={lastName} onChangeText={setLastName} />
          <ThemedTextInput
            placeholder="Favorite genres (e.g. rock, jazz, pop)"
            value={searchPreferences}
            onChangeText={setSearchPreferences}
            autoCapitalize="none"
          />

          {error2 ? <ThemedText style={styles.error}>{error2}</ThemedText> : null}
          {saved ? <ThemedText style={styles.saved}>Saved.</ThemedText> : null}

          <ThemedButton title="Save changes" onPress={handleSubmit} loading={saving} />
          <ThemedButton title="Cancel" onPress={() => router.back()} variant="ghost" />
        </AsyncState>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    fontSize: 13,
  },
  muted: {
    opacity: 0.6,
    fontSize: 12,
  },
  error: {
    color: '#ff4d4d',
  },
  saved: {
    fontSize: 13,
    opacity: 0.7,
  },
});
