import { ScrollView } from 'react-native';
import { MUSCLE_GROUPS } from '../../constants/exercises';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../theme/ThemeProvider';
import { availableMuscleGroups } from '../../utils/exerciseFilters';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

/** Search box + multi-select muscle chips, shared by the library and the exercise picker. */
export function ExerciseFilterBar({ exercises, query, onQueryChange, muscles, onMusclesChange }) {
  const theme = useTheme();
  const { gutter } = useResponsive();
  const groups = availableMuscleGroups(exercises, MUSCLE_GROUPS);
  const toggle = (key) => onMusclesChange(muscles.includes(key) ? muscles.filter((m) => m !== key) : [...muscles, key]);

  return (
    <>
      <TextField
        label="Search exercises"
        value={query}
        onChangeText={onQueryChange}
        placeholder="e.g. bench, squat, biceps, cable"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        testID="exercise-search"
        style={{ marginBottom: theme.spacing.md }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Filter by muscle group"
        contentContainerStyle={{ paddingRight: gutter }}
      >
        <Chip label="All" selected={muscles.length === 0} onPress={() => onMusclesChange([])} testID="muscle-chip-all" />
        {groups.map((g) => (
          <Chip
            key={g.key}
            label={g.label}
            selected={muscles.includes(g.key)}
            onPress={() => toggle(g.key)}
            testID={`muscle-chip-${g.key}`}
          />
        ))}
      </ScrollView>
    </>
  );
}
