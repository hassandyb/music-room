import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

export function ThemedButton({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const isDisabled = disabled || loading;

  const backgroundColor = variant === 'primary' ? colors.tint : variant === 'secondary' ? colors.surface : 'transparent';
  const textColor = variant === 'primary' ? '#ffffff' : colors.text;
  const borderColor = variant === 'ghost' ? 'transparent' : variant === 'secondary' ? colors.border : colors.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="defaultSemiBold" style={{ color: textColor }}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
