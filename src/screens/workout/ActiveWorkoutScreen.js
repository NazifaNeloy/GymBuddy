import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineBanner } from '../../components/states/OfflineBanner';
import { AppText } from '../../components/ui/AppText';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { SetRow } from '../../components/workout/SetRow';
import { useResponsive } from '../../hooks/useResponsive';
import { useExerciseStore } from '../../store/exerciseStore';
import {
  previousSets,
  selectActiveWorkout,
  selectWorkoutExercises,
  summarizeWorkout,
  useWorkoutStore,
} from '../../store/workoutStore';
import { useTheme } from '../../theme/ThemeProvider';
import { confirmAction } from '../../utils/confirm';
import { formatElapsed, formatNumber, formatThousands, plural } from '../../utils/format';

const SAVE_ERROR = "Couldn't save that on this phone. Please try again.";

/** Re-render once a second for the elapsed timer. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function lastTimeLabel(sets, tracking) {
  const best = sets.find((s) => !s.is_warmup) ?? sets[0];
  if (!best) return null;
  if (tracking === 'duration') return `Last time: ${best.duration_seconds ?? 0} sec`;
  if (tracking === 'bodyweight_reps') return `Last time: ${best.reps} reps`;
  return `Last time: ${formatNumber(best.weight_kg)} kg × ${best.reps}`;
}

function ExerciseBlock({ group, exercise, history, onAction }) {
  const theme = useTheme();
  const tracking = exercise?.tracking ?? 'weight_reps';
  const doneCount = group.sets.filter((s) => s.completed_at).length;
  const hint = lastTimeLabel(history, tracking);
  const testID = `exercise-${group.exerciseOrder}`;

  return (
    <Card testID={testID} style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" accessibilityRole="header">
            {exercise?.name ?? 'Exercise'}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {doneCount}/{plural(group.sets.length, 'set')} done{hint ? ` · ${hint}` : ''}
          </AppText>
        </View>
        <Button
          title="Remove"
          variant="ghost"
          onPress={() => onAction('removeExercise', group, exercise)}
          testID={`${testID}-remove`}
        />
      </View>

      <View style={{ marginTop: theme.spacing.sm }}>
        {group.sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            tracking={tracking}
            onChange={(patch) => onAction('updateSet', s, patch)}
            onToggleComplete={() => onAction('toggle', s)}
            onRemove={() => onAction('removeSet', s)}
            testID={`${testID}-set-${s.set_number}`}
          />
        ))}
      </View>

      <Button
        title="+ Add set"
        variant="secondary"
        onPress={() => onAction('addSet', group)}
        style={{ marginTop: theme.spacing.sm }}
        testID={`${testID}-add-set`}
      />
    </Card>
  );
}

/**
 * The workout in progress. Everything is written to the device first (workoutStore), so logging
 * works the same online and offline; the sync engine uploads in the background.
 */
export function ActiveWorkoutScreen({ navigation, route }) {
  const theme = useTheme();
  const { columns, gutter } = useResponsive();
  const now = useNow();
  const { pickedExerciseIds } = route.params ?? {};

  const workouts = useWorkoutStore((s) => s.workouts);
  const sets = useWorkoutStore((s) => s.sets);
  const actions = useWorkoutStore.getState();
  const exercises = useExerciseStore((s) => s.items);
  const exerciseStatus = useExerciseStore((s) => s.status);
  const exerciseError = useExerciseStore((s) => s.error);
  const loadExercises = useExerciseStore((s) => s.load);
  const exerciseById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const workout = useMemo(() => selectActiveWorkout({ workouts }), [workouts]);
  const groups = useMemo(
    () => (workout ? selectWorkoutExercises({ sets }, workout.id) : []),
    [workout, sets]
  );
  const histories = useMemo(() => {
    const h = {};
    if (workout) groups.forEach((g) => (h[g.exerciseId] ??= previousSets({ workouts, sets }, g.exerciseId, workout.id)));
    return h;
  }, [workout, workouts, sets, groups]); // not on every timer tick
  const summary = workout ? summarizeWorkout({ workouts, sets }, workout.id, new Date(now).toISOString()) : null;
  const totalSets = groups.reduce((n, g) => n + g.sets.length, 0);
  const doneSets = groups.reduce((n, g) => n + g.sets.filter((s) => s.completed_at).length, 0);

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const handledPick = useRef(null);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    navigation.setOptions({ title: workout?.name ?? 'Workout' });
  }, [navigation, workout?.name]);

  // Exercises chosen in the picker come back as route params; add each batch once.
  useEffect(() => {
    if (!workout || !pickedExerciseIds?.length || handledPick.current === pickedExerciseIds) return;
    handledPick.current = pickedExerciseIds;
    (async () => {
      try {
        for (const id of pickedExerciseIds) await useWorkoutStore.getState().addExercise(workout.id, id);
      } catch {
        setError(SAVE_ERROR);
      }
      navigation.setParams({ pickedExerciseIds: undefined });
    })();
  }, [pickedExerciseIds, workout, navigation]);

  const run = async (fn) => {
    setError(null);
    try {
      return await fn();
    } catch {
      setError(SAVE_ERROR);
      return undefined;
    }
  };

  const onAction = async (type, target, extra) => {
    switch (type) {
      case 'updateSet':
        return run(() => actions.updateSet(target.id, extra));
      case 'toggle':
        return run(() => actions.toggleSetComplete(target.id));
      case 'removeSet':
        return run(() => actions.removeSet(target.id));
      case 'addSet':
        return run(() => actions.addSet(workout.id, target.exerciseOrder));
      case 'removeExercise': {
        const logged = target.sets.some((s) => s.completed_at);
        const ok =
          !logged ||
          (await confirmAction({
            title: 'Remove exercise?',
            message: `${extra?.name ?? 'This exercise'} and its logged sets will be removed from this workout.`,
            confirmLabel: 'Remove',
            destructive: true,
          }));
        if (ok) await run(() => actions.removeExercise(workout.id, target.exerciseOrder));
        return undefined;
      }
      default:
        return undefined;
    }
  };

  const openPicker = () =>
    navigation.navigate('ExercisePicker', {
      returnTo: 'ActiveWorkout',
      alreadyAdded: groups.map((g) => g.exerciseId),
    });

  const discard = async ({ ask = true } = {}) => {
    const ok =
      !ask ||
      (await confirmAction({
        title: 'Discard workout?',
        message: 'Everything logged in this workout will be deleted.',
        confirmLabel: 'Discard',
        destructive: true,
      }));
    if (!ok) return;
    setBusy(true);
    await run(() => actions.discardWorkout(workout.id));
    setBusy(false);
    navigation.popToTop();
  };

  const finish = async () => {
    if (doneSets === 0) {
      const discardInstead = await confirmAction({
        title: 'Nothing logged yet',
        message: 'Tick ✓ on at least one set to finish. Discard this workout instead?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep logging',
        destructive: true,
      });
      if (discardInstead) await discard({ ask: false });
      return;
    }
    const unticked = totalSets - doneSets;
    const ok = await confirmAction({
      title: 'Finish workout?',
      message: unticked
        ? `${plural(unticked, 'unticked set')} will be removed. Your ticked sets are saved.`
        : 'Great work! Your workout will be saved.',
      confirmLabel: 'Finish',
    });
    if (!ok) return;
    setBusy(true);
    const result = await run(() => actions.finishWorkout(workout.id));
    setBusy(false);
    if (result?.ok) navigation.popToTop();
  };

  // ---- states ----
  if (!workout) {
    return (
      <EmptyState
        testID="no-active-workout"
        title="No workout in progress"
        message="Start an empty workout, or pick a routine and start one of its days."
        actionLabel="Start empty workout"
        onAction={() => run(() => actions.startWorkout())}
      />
    );
  }
  // Names are needed to show the exercises; a cold start without the library cached waits for it.
  if (groups.length > 0 && exercises.length === 0) {
    if (exerciseStatus !== 'idle' && exerciseStatus !== 'loading') {
      return (
        <ErrorState
          title="Couldn't load exercises"
          message={`${exerciseError ?? ''} Your logged sets are safe on this phone.`.trim()}
          onRetry={() => loadExercises({ force: true })}
        />
      );
    }
    return <LoadingState message="Loading exercises…" />;
  }

  const blockWidth = `${100 / Math.min(columns, 2)}%`;
  const gap = theme.spacing.md;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]} testID="active-workout-screen">
      <Screen>
        <OfflineBanner message="You're offline. Every set is saved on this phone and syncs later." />
        <Banner tone="error" message={error} testID="workout-error" />

        <View style={[styles.stats, { marginBottom: theme.spacing.lg }]} accessible accessibilityRole="summary">
          <Stat label="Time" value={formatElapsed(summary.durationSeconds)} testID="stat-time" />
          <Stat label="Sets done" value={`${doneSets}/${totalSets}`} testID="stat-sets" />
          <Stat label="Volume" value={`${formatThousands(summary.volumeKg)} kg`} testID="stat-volume" />
        </View>

        {groups.length === 0 ? (
          <EmptyState
            testID="workout-empty"
            title="Add your first exercise"
            message="Pick exercises from the library, then log each set as you go."
            actionLabel="Add exercise"
            onAction={openPicker}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
            {groups.map((g) => (
              <View key={g.exerciseOrder} style={{ width: blockWidth, paddingHorizontal: gap / 2 }}>
                <ExerciseBlock
                  group={g}
                  exercise={exerciseById[g.exerciseId]}
                  history={histories[g.exerciseId] ?? []}
                  onAction={onAction}
                />
              </View>
            ))}
          </View>
        )}

        {groups.length > 0 ? (
          <Button title="+ Add exercise" variant="secondary" onPress={openPicker} testID="add-exercise" />
        ) : null}
        <Button
          title="Discard workout"
          variant="ghost"
          onPress={() => discard()}
          disabled={busy}
          style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.lg }}
          testID="discard-workout"
        />
      </Screen>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingHorizontal: gutter,
            paddingVertical: theme.spacing.md,
          },
        ]}
      >
        <Button
          title="Finish workout"
          onPress={finish}
          loading={busy}
          testID="finish-workout"
          style={{ width: '100%', maxWidth: theme.layout.formMaxWidth, alignSelf: 'center' }}
        />
      </View>
    </View>
  );
}

function Stat({ label, value, testID }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="heading" testID={testID} style={{ marginTop: theme.spacing.xxs }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stats: { flexDirection: 'row' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
