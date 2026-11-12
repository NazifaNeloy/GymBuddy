import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

/** Labeled text input with inline error, optional hint and a show/hide toggle for passwords. */
export const TextField = forwardRef(function TextField(
  { label, error, hint, secureTextEntry = false, testID, style, ...inputProps },
  ref
) {
  const theme = useTheme();
  const { colors, radius, spacing, hitTarget, typography } = theme;
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      <AppText variant="label" style={{ marginBottom: spacing.xs }}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { borderColor, borderRadius: radius.md, backgroundColor: colors.inputBackground, minHeight: hitTarget },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry && hidden}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          testID={testID}
          {...inputProps}
          style={[styles.input, typography.body, { color: colors.text, paddingHorizontal: spacing.md }]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label}` : `Hide ${label}`}
            style={[styles.toggle, { paddingHorizontal: spacing.md, minHeight: hitTarget }]}
          >
            <AppText variant="label" color="primary">
              {hidden ? 'Show' : 'Hide'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: spacing.xs }} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, paddingVertical: 10 },
  toggle: { justifyContent: 'center' },
});
