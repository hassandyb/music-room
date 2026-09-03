import { Platform } from 'react-native';
import { apiFetch, apiFetchMultipart } from '../api-client';
import type { Profile, User } from '../types';

export async function getProfile(): Promise<User> {
  return apiFetch('/api/profile') as Promise<User>;
}

export async function createProfile(input: {
  firstName: string;
  lastName: string;
  location: string;
  genres: string;
  avatarUri?: string;
}): Promise<User> {
  const formData = new FormData();
  formData.append('firstName', input.firstName);
  formData.append('lastName', input.lastName);
  formData.append('location', input.location);
  formData.append('genres', input.genres);

  if (input.avatarUri) {
    const filename = input.avatarUri.split('/').pop() ?? 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (Platform.OS === 'web') {
      // The {uri, name, type} object below is a React Native-only FormData
      // convention - the browser's real FormData/fetch doesn't understand it
      // and silently stringifies the object instead of attaching bytes, so on
      // web we fetch the picked image ourselves and attach a real Blob.
      const blob = await (await fetch(input.avatarUri)).blob();
      formData.append('avatar', blob, filename);
    } else {
      formData.append('avatar', { uri: input.avatarUri, name: filename, type } as unknown as Blob);
    }
  }

  return apiFetchMultipart('/api/profile', formData, { method: 'POST' }) as Promise<User>;
}

// PUT /api/profile is a real, persisted, multipart endpoint - it upserts the
// Profile row (firstName/lastName/avatar) and, if given, renames the User's
// username (409s server-side if already taken).
export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  username?: string;
  searchPreferences?: string;
  avatarUri?: string;
}): Promise<User> {
  const formData = new FormData();
  if (input.firstName !== undefined) formData.append('firstName', input.firstName);
  if (input.lastName !== undefined) formData.append('lastName', input.lastName);
  if (input.username !== undefined) formData.append('username', input.username);
  if (input.searchPreferences !== undefined) formData.append('searchPreferences', input.searchPreferences);

  if (input.avatarUri) {
    const filename = input.avatarUri.split('/').pop() ?? 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (Platform.OS === 'web') {
      const blob = await (await fetch(input.avatarUri)).blob();
      formData.append('avatar', blob, filename);
    } else {
      formData.append('avatar', { uri: input.avatarUri, name: filename, type } as unknown as Blob);
    }
  }

  return apiFetchMultipart('/api/profile', formData, { method: 'PUT' }) as Promise<User>;
}

// Upserts the Profile row server-side, returns the Profile row directly - not
// wrapped in a User, unlike updateProfile() above.
export async function updateSubscription(subscription: Profile['subscription']): Promise<Profile> {
  return apiFetch('/api/profile/subscription', { method: 'PATCH', body: { subscription } }) as Promise<Profile>;
}
