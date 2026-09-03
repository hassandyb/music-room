import { apiFetch } from '../api-client';
import type { Track } from '../types';

// GET /api/track/search is the only real, working track endpoint (DB + Jamendo
// fallback). GET /api/track/tracks and GET /api/track/track/:id are empty
// stubs server-side - not used here.
export function searchTracks(query: string): Promise<Track[]> {
  if (!query.trim()) return Promise.resolve([]);
  return apiFetch(`/api/track/search?query=${encodeURIComponent(query)}`) as Promise<Track[]>;
}
