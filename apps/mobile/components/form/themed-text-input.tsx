import { TextInput, StyleSheet, type TextInputProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ThemedTextInput(props: TextInputProps) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <TextInput
      placeholderTextColor={colors.icon}
      style={[
        styles.input,
        { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
        props.style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
});
