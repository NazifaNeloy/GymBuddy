import { View } from 'react-native';
import { equipmentLabel, muscleLabel } from '../../constants/exercises';
import { useTheme } from '../../theme/ThemeProvider';
import { formatSeconds } from '../../utils/format';
import { LIMITS } from '../../utils/routineDraft';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stepper } from '../ui/Stepper';

/** One exercise in a routine day: targets (sets, reps or seconds, rest) plus reorder/remove. */
export function RoutineItemEditor({ item, exercise, index, count, readOnly = false, onChange, onMove, onRemove }) {
  const theme = useTheme();
  const timed = exercise?.tracking === 'duration';
  const unit = timed ? 'Seconds' : 'Reps';
  const name = exercise?.name ?? 'Unknown exercise';
  const tid = `item-${index}`;

  return (
    <Card style={{ marginBottom: theme.spacing.md }} testID={tid}>
      <AppText variant="heading">
        {index + 1}. {name}
      </AppText>
      {exercise ? (
        <AppText variant="caption" color="textMuted" style={{ marginBottom: theme.spacing.md }}>
          {muscleLabel(exercise.primary_muscle)} · {equipmentLabel(exercise.equipment)}
        </AppText>
      ) : null}

      {readOnly ? (
        <AppText color="textMuted">
          {item.targetSets} sets × {item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`}{' '}
          {timed ? 'sec' : 'reps'} · rest {formatSeconds(item.restSeconds)}
        </AppText>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stepper
              label="Sets"
              value={item.targetSets}
              min={LIMITS.sets[0]}
              max={LIMITS.sets[1]}
              onChange={(v) => onChange({ targetSets: v })}
              testID={`${tid}-sets`}
            />
            <Stepper
              label={`${unit} min`}
              value={item.repsMin}
              step={timed ? 5 : 1}
              min={LIMITS.reps[0]}
              max={LIMITS.reps[1]}
              onChange={(v) => onChange({ repsMin: v })}
              testID={`${tid}-min`}
            />
            <Stepper
              label={`${unit} max`}
              value={item.repsMax}
              step={timed ? 5 : 1}
              min={LIMITS.reps[0]}
              max={LIMITS.reps[1]}
              onChange={(v) => onChange({ repsMax: v })}
              testID={`${tid}-max`}
            />
            <Stepper
              label="Rest"
              value={item.restSeconds}
              step={15}
              min={LIMITS.rest[0]}
              max={LIMITS.rest[1]}
              format={formatSeconds}
              onChange={(v) => onChange({ restSeconds: v })}
              testID={`${tid}-rest`}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.xs }}>
            <Button title="Move up" variant="ghost" onPress={() => onMove(-1)} disabled={index === 0} />
            <Button title="Move down" variant="ghost" onPress={() => onMove(1)} disabled={index === count - 1} />
            <Button title="Remove" variant="ghost" onPress={onRemove} testID={`${tid}-remove`} />
          </View>
        </>
      )}
    </Card>
  );
}
