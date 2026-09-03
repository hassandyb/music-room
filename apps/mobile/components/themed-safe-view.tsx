import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView, type ThemedViewProps } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

// Drop-in replacement for a screen's outermost ThemedView on headerShown:false
// screens (the tabs, auth screens) - adds the status-bar/notch top inset as a
// separate wrapper so it never fights with the screen's own `padding` style.
export function ThemedSafeView({ children, style, lightColor, darkColor, ...rest }: ThemedViewProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor }}>
      <ThemedView style={style} lightColor={lightColor} darkColor={darkColor} {...rest}>
        {children}
      </ThemedView>
    </View>
  );
}
