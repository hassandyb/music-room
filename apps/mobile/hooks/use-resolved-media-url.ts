import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/media';

export function useResolvedMediaUrl(path: string | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    resolveMediaUrl(path)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch((err) => console.warn('Failed to resolve media URL', err));
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
