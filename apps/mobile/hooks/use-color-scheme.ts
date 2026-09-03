import { useThemePreference } from '@/context/theme-preference-context';

export function useColorScheme() {
  return useThemePreference().effectiveScheme;
}
