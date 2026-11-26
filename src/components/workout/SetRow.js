import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { formatNumber } from '../../utils/format';
import { AppText } from '../ui/AppText';

/** "62,5" -> 62.5; returns null while the text is not a complete number yet (e.g. "" or "62."). */
export function parseNumber(text) {
  const t = text.replace(',', '.').trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/**
 * Numeric input that writes every valid keystroke straight to the store (offline-first, no save button)
 * but keeps the raw text while focused, so "62." is not reformatted under the user's thumb.
 */
function NumberInput({ value, onChange, decimal = false, label, unit, testID }) {
  const theme = useTheme();
  const { colors, radius, spacing, hitTarget, typography } = theme;
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const shown = focused ? text : value ? formatNumber(value) : '';

  return (
    <View style={[styles.inputWrap, { marginRight: spacing.sm }]}>
      <TextInput
        value={shown}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        selectTextOnFocus
        maxLength={decimal ? 7 : 5}
        accessibilityLabel={label}
        testID={testID}
        onFocus={() => {
          setText(value ? formatNumber(value) : '');
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          if (text.trim() === '') onChange(0);
        }}
        onChangeText={(t) => {
          setText(t);
          const n = parseNumber(t);
          if (n !== null) onChange(decimal ? n : Math.round(n));
        }}
        style={[
          typography.label,
          styles.input,
          {
            minHeight: hitTarget - 4,
            borderRadius: radius.md,
            borderColor: focused ? colors.primary : colors.borderStrong,
            backgroundColor: colors.inputBackground,
            color: colors.text,
            paddingHorizontal: spacing.sm,
          },
        ]}
      />
      <AppText variant="caption" color="textMuted" style={{ marginLeft: spacing.xs }}>
        {unit}
      </AppText>
    </View>
  );
}

/**
 * One logged set. Layout depends on how the exercise is tracked:
 *  weight_reps: [kg] × [reps] · bodyweight_reps: [reps] · duration: [sec]
 * Tapping the set number toggles warm-up ("W").
 */
export function SetRow({ set, tracking = 'weight_reps', onChange, onToggleComplete, onRemove, testID }) {
  const theme = useTheme();
  const { colors, radius, spacing, hitTarget } = theme;
  const done = Boolean(set.completed_at);
  const label = set.is_warmup ? 'Warm-up set' : `Set ${set.set_number}`;
  const id = testID ?? `set-${set.id}`;

  return (
    <View
      testID={id}
      style={[
        styles.row,
        {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.xs,
          borderRadius: radius.md,
          backgroundColor: done ? colors.successSoft : 'transparent',
        },
      ]}
    >
      <Pressable
        onPress={() => onChange({ is_warmup: !set.is_warmup })}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Double tap to mark as ${set.is_warmup ? 'a working set' : 'a warm-up'}`}
        testID={`${id}-warmup`}
        style={[styles.number, { width: 36, minHeight: hitTarget, marginRight: spacing.xs }]}
      >
        <AppText variant="label" color={set.is_warmup ? 'warning' : 'textMuted'}>
          {set.is_warmup ? 'W' : set.set_number}
        </AppText>
      </Pressable>

      {tracking === 'duration' ? (
        <NumberInput
          value={set.duration_seconds ?? 0}
          onChange={(duration_seconds) => onChange({ duration_seconds })}
          label={`${label} seconds`}
          unit="sec"
          testID={`${id}-seconds`}
        />
      ) : (
        <>
          {tracking === 'weight_reps' ? (
            <NumberInput
              value={set.weight_kg}
              onChange={(weight_kg) => onChange({ weight_kg })}
              decimal
              label={`${label} weight in kilograms`}
              unit="kg"
              testID={`${id}-weight`}
            />
          ) : null}
          <NumberInput
            value={set.reps}
            onChange={(reps) => onChange({ reps })}
            label={`${label} reps`}
            unit="reps"
            testID={`${id}-reps`}
          />
        </>
      )}

      <Pressable
        onPress={onToggleComplete}
        accessibilityRole="checkbox"
        accessibilityLabel={`${label} done`}
        accessibilityState={{ checked: done }}
        testID={`${id}-done`}
        style={({ pressed }) => [
          styles.check,
          {
            width: hitTarget - 4,
            height: hitTarget - 4,
            borderRadius: radius.md,
            borderColor: done ? colors.success : colors.borderStrong,
            backgroundColor: done ? colors.success : pressed ? colors.surfaceAlt : colors.surface,
          },
        ]}
      >
        <AppText variant="heading" color={done ? 'onPrimary' : 'textMuted'}>
          ✓
        </AppText>
      </Pressable>

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label.toLowerCase()}`}
        hitSlop={4}
        testID={`${id}-remove`}
        style={[styles.number, { width: 32, minHeight: hitTarget, marginLeft: spacing.xs }]}
      >
        <AppText variant="label" color="textMuted">
          ✕
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  number: { alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, textAlign: 'center', paddingVertical: 0 },
  check: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
