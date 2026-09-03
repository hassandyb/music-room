import { resolveMediaUrl as resolveBackendMediaUrl } from './api-config';

// Avatar/profile/cover images are stored by the backend's local storage
// service (apps/api/src/storage/local-storage.service.ts) and returned as a
// relative path like "/files/<uuid>-name.jpg". Delegates to api-config.ts's
// resolveMediaUrl for the actual prefixing - on web that one also routes the
// request through a fetch-with-header + blob URL, since a plain <img>/<audio>
// src can't send the ngrok-skip-browser-warning header ngrok's free tier
// requires (see api-config.ts's own comment for the full story).
export async function resolveMediaUrl(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return resolveBackendMediaUrl(path);
}
