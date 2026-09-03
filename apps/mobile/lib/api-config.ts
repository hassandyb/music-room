import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function getBackendUrl(): Promise<string> {
  return BACKEND_URL;
}

// <img>/<audio> tags can't set custom headers, so the ngrok-skip-browser-warning
// header apiFetch sends doesn't apply to them - ngrok's free-tier browser
// warning page intercepts the request (there is no query-param bypass, only
// the header). Native platforms are unaffected - ngrok only shows the
// interstitial to browser user-agents - so this only matters on web, where we
// fetch the resource ourselves (with the header) and hand the tag a blob URL
// instead of the raw remote URL.
export async function resolveMediaUrl(path: string): Promise<string> {
  const baseUrl = await getBackendUrl();
  const url = `${baseUrl}${path}`;
  if (Platform.OS !== 'web') return url;

  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
