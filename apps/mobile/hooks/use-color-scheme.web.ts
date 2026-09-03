import { useEffect, useState } from 'react';

import { useThemePreference } from '@/context/theme-preference-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { effectiveScheme } = useThemePreference();

  if (hasHydrated) {
    return effectiveScheme;
  }

  return 'light';
}
