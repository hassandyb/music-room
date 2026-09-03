import { apiFetch } from '../api-client';
import type { UserSearchResult } from '../types';

export function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query.trim()) return Promise.resolve([]);
  return apiFetch(`/api/users/search?query=${encodeURIComponent(query)}`) as Promise<UserSearchResult[]>;
}
