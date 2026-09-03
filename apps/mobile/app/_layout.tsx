import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ThemePreferenceProvider } from '@/context/theme-preference-context';
import { ThemedText } from '@/components/themed-text';

// React Navigation's native-stack header doesn't reliably honor
// headerTitleStyle.fontFamily across platforms/versions - rendering the
// title through our own ThemedText guarantees it uses the same font
// pipeline (and proven-working font names) as every other piece of text
// in the app.
function HeaderTitle({ children }: { children: string }) {
  return <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>{children}</ThemedText>;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { state } = useAuth();

  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (state.status === 'loading' || !fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle> }}>
        <Stack.Protected guard={state.status === 'authenticated' && !state.user.profile}>
          <Stack.Screen name="profile/create" options={{ title: 'Create profile' }} />
        </Stack.Protected>
        <Stack.Protected guard={state.status === 'authenticated' && !!state.user.profile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile/edit" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="friends" options={{ title: 'Friends' }} />
          <Stack.Screen name="events/create" options={{ title: 'New event' }} />
          <Stack.Screen name="events/[id]" options={{ title: 'Event' }} />
          <Stack.Screen name="playlists/invitations" options={{ title: 'Invitations' }} />
          <Stack.Screen name="playlists/create" options={{ title: 'New playlist' }} />
          <Stack.Screen name="playlists/[id]" options={{ title: 'Playlist' }} />
          <Stack.Screen name="playlists/[id]/collaborators" options={{ title: 'Members' }} />
          <Stack.Screen name="playlists/[id]/invite" options={{ title: 'Invite a friend' }} />
          <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
          <Stack.Screen name="lyrics/[trackId]" options={{ title: 'Lyrics' }} />
        </Stack.Protected>
        <Stack.Protected guard={state.status !== 'authenticated'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // Required ancestor for react-native-draggable-flatlist's pan gesture
    // (used by the playlist track reorder screen) - gesture-handler was
    // already a transitive dep of expo-router but nothing mounted its root
    // view until now.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemePreferenceProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemePreferenceProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
