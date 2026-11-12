import { View } from 'react-native';
import { equipmentLabel, muscleLabel } from '../../constants/exercises';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';

export function ExerciseCard({ exercise, onPress, style }) {
  const theme = useTheme();
  const secondary = (exercise.secondary_muscles ?? []).map(muscleLabel).join(', ');
  const isCustom = Boolean(exercise.user_id);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${exercise.name}, ${muscleLabel(exercise.primary_muscle)}, ${equipmentLabel(exercise.equipment)}`}
      accessibilityHint="Opens exercise details"
      testID={`exercise-card-${exercise.id}`}
      style={style}
    >
      <AppText variant="heading" numberOfLines={2}>
        {exercise.name}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.xs }}>
        <AppText variant="label" color="primary">
          {muscleLabel(exercise.primary_muscle)}
        </AppText>
        <AppText variant="label" color="textMuted">
          {`  ·  ${equipmentLabel(exercise.equipment)}`}
          {isCustom ? '  ·  Custom' : ''}
        </AppText>
      </View>
      {secondary ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: theme.spacing.xs }}>
          Also works: {secondary}
        </AppText>
      ) : null}
    </Card>
  );
}
