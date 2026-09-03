import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
type EffectiveScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  effectiveScheme: EffectiveScheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const effectiveScheme: EffectiveScheme = preference === 'system' ? (systemScheme ?? 'light') : preference;

  const value = useMemo(
    () => ({ preference, effectiveScheme, setPreference }),
    [preference, effectiveScheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

// Used by the Settings screen to read/change the raw Light/Dark/System
// choice. Everywhere else in the app should keep using useColorScheme()
// (hooks/use-color-scheme.ts) which resolves 'system' down to an actual
// light/dark value - this hook is only for the picker UI itself.
export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
