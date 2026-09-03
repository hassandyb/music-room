// lyrics.ovh is a free, keyless public API - safe to call directly from the
// client, no backend involvement needed. There's no Music Room lyrics model
// or endpoint at all yet, so this is entirely independent of apps/api.
export async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  const res = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { lyrics?: string; error?: string };
  return json.lyrics?.trim() || null;
}
