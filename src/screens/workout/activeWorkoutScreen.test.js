import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { WorkoutStack } from '../../navigation/WorkoutStack';
import * as queue from '../../services/sync/queue';
import { useAuthStore } from '../../store/authStore';
import { useExerciseStore } from '../../store/exerciseStore';
import { useRoutineStore } from '../../store/routineStore';
import { selectActiveWorkout, selectHistory, useWorkoutStore } from '../../store/workoutStore';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { confirmAction } from '../../utils/confirm';
import { parseNumber } from '../../components/workout/SetRow';
import { fetchExercises } from '../../services/supabase/repositories/exercises';

jest.mock('../../services/sync/syncEngine', () => ({
  registerPullTarget: jest.fn(),
  syncNow: jest.fn(async () => ({ ok: true })),
}));
jest.mock('../../services/supabase/repositories/exercises', () => ({ fetchExercises: jest.fn(async () => []) }));
jest.mock('../../utils/confirm', () => ({ confirmAction: jest.fn(async () => true) }));

const USER = 'user-1';
const T0 = '2026-11-27T10:00:00.000Z';
const ex = (id, name, extra = {}) => ({
  id,
  name,
  primary_muscle: 'chest',
  secondary_muscles: [],
  equipment: 'barbell',
  category: 'compound',
  tracking: 'weight_reps',
  ...extra,
});
const exercises = [
  ex('bench', 'Barbell Bench Press'),
  ex('squat', 'Back Squat', { primary_muscle: 'quads' }),
  ex('plank', 'Plank', { primary_muscle: 'core', tracking: 'duration', category: 'isolation' }),
];
const template = {
  id: 'tpl',
  user_id: null,
  name: 'Full Body',
  description: 'Starter plan',
  days: ['Full Body'],
  source_template_id: null,
  updated_at: T0,
  deleted_at: null,
};
const templateRow = {
  id: 'tpl-1',
  routine_id: 'tpl',
  user_id: null,
  exercise_id: 'squat',
  day_index: 0,
  position: 0,
  target_sets: 3,
  target_reps_min: 8,
  target_reps_max: 12,
  rest_seconds: 90,
  notes: null,
  updated_at: T0,
  deleted_at: null,
};

const workoutState = () => useWorkoutStore.getState();

async function renderWorkout() {
  await render(
    <ThemeProvider>
      <NavigationContainer>
        <WorkoutStack />
      </NavigationContainer>
    </ThemeProvider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queue.__resetForTests();
  useWorkoutStore.getState().reset();
  useRoutineStore.getState().reset();
  useRoutineStore.setState({
    routines: { tpl: template },
    routineExercises: { 'tpl-1': templateRow },
    status: 'ready',
  });
  useExerciseStore.setState({ items: exercises, lastFetchedAt: Date.now(), status: 'ready', error: null });
  useAuthStore.setState({ status: 'signedIn', user: { id: USER } });
});

describe('starting and logging an empty workout', () => {
  it('adds an exercise, logs a set offline-first and finishes into history', async () => {
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('start-empty-workout'));
    expect(await screen.findByTestId('workout-empty')).toBeTruthy();

    // Empty state CTA opens the picker, which returns to the workout.
    await fireEvent.press(screen.getByText('Add exercise'));
    await screen.findByTestId('exercise-picker-screen');
    await fireEvent.press(screen.getByTestId('pick-bench'));
    await fireEvent.press(screen.getByTestId('picker-done'));
    await screen.findByTestId('active-workout-screen');
    expect(await screen.findByText('Barbell Bench Press')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('exercise-0-set-1-weight'), '60');
    await fireEvent.changeText(screen.getByTestId('exercise-0-set-1-reps'), '10');
    await fireEvent.press(screen.getByTestId('exercise-0-set-1-done'));

    expect(screen.getByTestId('stat-sets')).toHaveTextContent('1/1');
    expect(screen.getByTestId('stat-volume')).toHaveTextContent('600 kg');
    expect(screen.getByTestId('exercise-0-set-1-done').props.accessibilityState).toEqual({ checked: true });

    await fireEvent.press(screen.getByTestId('finish-workout'));
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Finish workout?' }));
    await screen.findByTestId('routine-list-screen');
    expect(screen.getByTestId('start-empty-workout')).toBeTruthy(); // nothing in progress any more

    const [done] = selectHistory(workoutState());
    expect(done).toMatchObject({ name: 'Quick workout', user_id: USER });
    const q = await queue.getAll();
    expect(q[0].table).toBe('workouts');
    expect(q.find((e) => e.table === 'workout_sets').payload).toMatchObject({ weight_kg: 60, reps: 10 });
  });

  it('adds and removes sets and marks warm-ups', async () => {
    await workoutState().startWorkout({}, { userId: USER });
    await workoutState().addExercise(selectActiveWorkout(workoutState()).id, 'bench');
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));

    await fireEvent.press(await screen.findByTestId('exercise-0-add-set'));
    await fireEvent.press(screen.getByTestId('exercise-0-add-set'));
    expect(screen.getByTestId('stat-sets')).toHaveTextContent('0/3');

    await fireEvent.press(screen.getByTestId('exercise-0-set-1-warmup'));
    expect(within(screen.getByTestId('exercise-0-set-1')).getByText('W')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('exercise-0-set-3-remove'));
    expect(screen.getByTestId('stat-sets')).toHaveTextContent('0/2');
  });

  it('shows the duration input for timed exercises', async () => {
    const id = await workoutState().startWorkout({}, { userId: USER });
    await workoutState().addExercise(id, 'plank');
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));
    expect(await screen.findByTestId('exercise-0-set-1-seconds')).toBeTruthy();
    expect(screen.queryByTestId('exercise-0-set-1-weight')).toBeNull();
  });
});

describe('starting from a routine', () => {
  it('starts a routine day pre-filled with its target sets, and can be resumed', async () => {
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('routine-card-tpl'));
    await fireEvent.press(await screen.findByTestId('start-day'));

    await screen.findByTestId('active-workout-screen');
    expect(screen.getByText('Back Squat')).toBeTruthy();
    expect(screen.getByTestId('stat-sets')).toHaveTextContent('0/3');
    expect(screen.getByTestId('exercise-0-set-1-reps').props.value).toBe('8');
    expect(selectActiveWorkout(workoutState())).toMatchObject({ routine_id: 'tpl', name: 'Full Body' });
  });
});

describe('finish and discard', () => {
  it('offers to discard when nothing has been ticked', async () => {
    const id = await workoutState().startWorkout({}, { userId: USER });
    await workoutState().addExercise(id, 'bench');
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));

    await fireEvent.press(await screen.findByTestId('finish-workout'));
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nothing logged yet' }));
    await screen.findByTestId('routine-list-screen');
    expect(workoutState().workouts[id].deleted_at).toBeTruthy();
  });

  it('keeps the workout when the user cancels discard', async () => {
    confirmAction.mockResolvedValueOnce(false);
    const id = await workoutState().startWorkout({}, { userId: USER });
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));
    await fireEvent.press(await screen.findByTestId('discard-workout'));
    expect(screen.getByTestId('active-workout-screen')).toBeTruthy();
    expect(workoutState().workouts[id].deleted_at).toBeNull();
  });

  it('asks before removing an exercise that has logged sets', async () => {
    const id = await workoutState().startWorkout({}, { userId: USER });
    await workoutState().addExercise(id, 'bench');
    await workoutState().addExercise(id, 'squat');
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));

    // Not logged yet: removed without asking.
    await fireEvent.press(await screen.findByTestId('exercise-1-remove'));
    expect(confirmAction).not.toHaveBeenCalled();
    expect(screen.queryByText('Back Squat')).toBeNull();

    await fireEvent.press(screen.getByTestId('exercise-0-set-1-done'));
    await fireEvent.press(screen.getByTestId('exercise-0-remove'));
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove exercise?' }));
    expect(await screen.findByTestId('workout-empty')).toBeTruthy();
  });
});

describe('states', () => {
  it('shows an empty state when no workout is in progress', async () => {
    await renderWorkout();
    // Deep link straight to the screen (e.g. after finishing on another device).
    await fireEvent.press(await screen.findByTestId('start-empty-workout'));
    const id = selectActiveWorkout(workoutState()).id;
    await workoutState().discardWorkout(id);
    expect(await screen.findByTestId('no-active-workout')).toBeTruthy();
  });

  it('shows an error with retry when exercise names cannot be loaded', async () => {
    const id = await workoutState().startWorkout({}, { userId: USER });
    await workoutState().addExercise(id, 'bench', { getExercise: () => exercises[0] });
    useExerciseStore.setState({ items: [], status: 'idle', error: null, lastFetchedAt: null });
    fetchExercises.mockRejectedValueOnce(new Error('Network request failed'));
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('resume-workout'));
    expect(await screen.findByText("Couldn't load exercises")).toBeTruthy();
    expect(screen.getByText(/logged sets are safe/)).toBeTruthy();
  });
});

describe('parseNumber', () => {
  it('accepts comma decimals and rejects partial input', () => {
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber('62.')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});
