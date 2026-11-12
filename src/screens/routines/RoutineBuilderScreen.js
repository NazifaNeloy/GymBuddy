import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { RoutineItemEditor } from '../../components/routines/RoutineItemEditor';
import { ErrorState } from '../../components/states/ErrorState';
import { OfflineBanner } from '../../components/states/OfflineBanner';
import { AppText } from '../../components/ui/AppText';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useExerciseStore } from '../../store/exerciseStore';
import { useRoutineStore } from '../../store/routineStore';
import { useTheme } from '../../theme/ThemeProvider';
import { confirmAction } from '../../utils/confirm';
import {
  LIMITS,
  addDay,
  addExercises,
  draftFromRoutine,
  emptyDraft,
  isDraftDirty,
  itemsForDay,
  moveItem,
  removeDay,
  removeItem,
  renameDay,
  updateItem,
  validateDraft,
} from '../../utils/routineDraft';

/**
 * Create / edit a routine (params: { routineId } or nothing for new),
 * or preview a starter routine read-only (params: { templateId }).
 */
export function RoutineBuilderScreen({ navigation, route }) {
  const theme = useTheme();
  const { routineId, templateId, pickedExerciseIds, pickedDayIndex } = route.params ?? {};
  const sourceId = routineId ?? templateId;
  const readOnly = Boolean(templateId);

  const routine = useRoutineStore((s) => (sourceId ? s.routines[sourceId] : null));
  const saveDraft = useRoutineStore((s) => s.saveDraft);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);
  const copyTemplate = useRoutineStore((s) => s.copyTemplate);
  const exercises = useExerciseStore((s) => s.items);
  const loadExercises = useExerciseStore((s) => s.load);
  const exerciseById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  // Snapshot the saved version once, as the starting draft.
  const [original] = useState(() => {
    if (!sourceId) return emptyDraft();
    const state = useRoutineStore.getState();
    const r = state.routines[sourceId];
    return r && !r.deleted_at ? draftFromRoutine(r, Object.values(state.routineExercises)) : null;
  });
  const [draft, setDraft] = useState(original);
  const [day, setDay] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const leaving = useRef(false);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Exercises chosen in the picker come back as route params. Apply each batch once
  // (React's "adjust state when props change" pattern), then clear the params.
  const [handledPick, setHandledPick] = useState(null);
  if (pickedExerciseIds?.length && pickedExerciseIds !== handledPick && draft) {
    const picked = pickedExerciseIds.map((id) => exerciseById[id]).filter(Boolean);
    setHandledPick(pickedExerciseIds);
    setDraft(addExercises(draft, pickedDayIndex ?? 0, picked));
  }
  useEffect(() => {
    if (pickedExerciseIds?.length) navigation.setParams({ pickedExerciseIds: undefined, pickedDayIndex: undefined });
  }, [pickedExerciseIds, navigation]);

  const dirty = !readOnly && draft && original && isDraftDirty(original, draft);

  // Ask before throwing away unsaved changes.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!dirty || leaving.current) return;
      e.preventDefault();
      confirmAction({
        title: 'Discard changes?',
        message: 'Your changes to this routine have not been saved.',
        confirmLabel: 'Discard',
        destructive: true,
      }).then((ok) => {
        if (ok) {
          leaving.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation, dirty]);

  useEffect(() => {
    navigation.setOptions({ title: readOnly ? 'Starter routine' : original?.isNew ? 'New routine' : 'Edit routine' });
  }, [navigation, readOnly, original]);

  if (!draft || (sourceId && !routine)) {
    return (
      <ErrorState
        title="Routine not found"
        message="It may have been deleted on another device."
        onRetry={() => navigation.goBack()}
        retryLabel="Go back"
      />
    );
  }

  const errors = submitted ? validateDraft(draft) : {};
  const dayItems = itemsForDay(draft, Math.min(day, draft.days.length - 1));
  const currentDay = Math.min(day, draft.days.length - 1);

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(validateDraft(draft)).length > 0) return;
    setBusy(true);
    setActionError(null);
    try {
      await saveDraft(draft);
      leaving.current = true;
      navigation.goBack();
    } catch {
      setActionError("Couldn't save the routine on this phone. Please try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: 'Delete routine?',
      message: `"${draft.name}" will be removed from all your devices. Past workouts are kept.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    await deleteRoutine(draft.id);
    leaving.current = true;
    navigation.goBack();
  };

  const useTemplate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const newId = await copyTemplate(templateId);
      leaving.current = true;
      navigation.replace('RoutineBuilder', { routineId: newId });
    } catch {
      setActionError("Couldn't copy this routine. Please try again.");
      setBusy(false);
    }
  };

  const openPicker = () =>
    navigation.navigate('ExercisePicker', {
      dayIndex: currentDay,
      dayName: draft.days[currentDay],
      alreadyAdded: dayItems.map((i) => i.exerciseId),
    });

  return (
    <Screen testID="routine-builder-screen">
      <OfflineBanner message="You're offline. Saving works; changes will sync later." />
      <Banner tone="error" message={actionError} />

      {readOnly ? (
        <>
          <AppText variant="title" accessibilityRole="header">
            {draft.name}
          </AppText>
          {draft.description ? (
            <AppText color="textMuted" style={{ marginTop: theme.spacing.xs }}>
              {draft.description}
            </AppText>
          ) : null}
          <Button
            title="Use this routine"
            onPress={useTemplate}
            loading={busy}
            style={{ marginVertical: theme.spacing.lg }}
            testID="use-template"
          />
        </>
      ) : (
        <>
          <TextField
            label="Routine name"
            value={draft.name}
            onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
            error={errors.name}
            placeholder="e.g. Push day, Beginner full body"
            maxLength={LIMITS.name}
            testID="routine-name"
          />
          <TextField
            label="Description (optional)"
            value={draft.description}
            onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
            error={errors.description}
            placeholder="Goal, notes, when to do it…"
            multiline
            maxLength={LIMITS.description}
            testID="routine-description"
          />
        </>
      )}

      <AppText variant="heading" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
        Days
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {draft.days.map((name, i) => (
          <Chip
            key={i}
            label={name.trim() || `Day ${i + 1}`}
            selected={i === currentDay}
            onPress={() => setDay(i)}
            testID={`day-chip-${i}`}
          />
        ))}
        {!readOnly && draft.days.length < LIMITS.maxDays ? (
          <Chip
            label="+ Add day"
            onPress={() => {
              setDraft((d) => addDay(d));
              setDay(draft.days.length);
            }}
            testID="add-day"
          />
        ) : null}
      </View>

      {!readOnly ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <TextField
            label="Day name"
            value={draft.days[currentDay]}
            onChangeText={(name) => setDraft((d) => renameDay(d, currentDay, name))}
            error={errors.days}
            maxLength={LIMITS.dayName}
            testID="day-name"
          />
          {draft.days.length > 1 ? (
            <Button
              title={`Remove "${draft.days[currentDay]}"`}
              variant="ghost"
              onPress={async () => {
                const ok =
                  dayItems.length === 0 ||
                  (await confirmAction({
                    title: 'Remove this day?',
                    message: 'Its exercises will be removed from the routine.',
                    confirmLabel: 'Remove',
                    destructive: true,
                  }));
                if (!ok) return;
                setDraft((d) => removeDay(d, currentDay));
                setDay((i) => Math.max(0, i - 1));
              }}
              style={{ alignSelf: 'flex-start', marginTop: -theme.spacing.sm, marginBottom: theme.spacing.md }}
              testID="remove-day"
            />
          ) : null}
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.sm }}>
        {dayItems.length === 0 ? (
          <Card testID="day-empty">
            <AppText variant="label">No exercises on this day yet</AppText>
            <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxs }}>
              Add exercises from the library and set your target sets and reps.
            </AppText>
          </Card>
        ) : (
          dayItems.map((item, index) => (
            <RoutineItemEditor
              key={item.id}
              item={item}
              exercise={exerciseById[item.exerciseId]}
              index={index}
              count={dayItems.length}
              readOnly={readOnly}
              onChange={(patch) => setDraft((d) => updateItem(d, item.id, patch))}
              onMove={(dir) => setDraft((d) => moveItem(d, item.id, dir))}
              onRemove={() => setDraft((d) => removeItem(d, item.id))}
            />
          ))
        )}
      </View>

      {!readOnly ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button title="Add exercises" variant="secondary" onPress={openPicker} testID="add-exercises" />
          <Button
            title={original.isNew ? 'Create routine' : 'Save changes'}
            onPress={save}
            loading={busy}
            disabled={!original.isNew && !dirty}
            style={{ marginTop: theme.spacing.md }}
            testID="save-routine"
          />
          {!original.isNew ? (
            <Button
              title="Delete routine"
              variant="ghost"
              onPress={remove}
              disabled={busy}
              style={{ marginTop: theme.spacing.md }}
              testID="delete-routine"
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
