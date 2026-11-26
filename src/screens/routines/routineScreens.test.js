import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { WorkoutStack } from '../../navigation/WorkoutStack';
import * as queue from '../../services/sync/queue';
import { syncNow } from '../../services/sync/syncEngine';
import { useAuthStore } from '../../store/authStore';
import { useExerciseStore } from '../../store/exerciseStore';
import { useRoutineStore } from '../../store/routineStore';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { confirmAction } from '../../utils/confirm';

jest.mock('../../services/sync/syncEngine', () => ({
  registerPullTarget: jest.fn(),
  syncNow: jest.fn(async () => ({ ok: true })),
}));
jest.mock('../../services/supabase/repositories/exercises', () => ({ fetchExercises: jest.fn(async () => []) }));
jest.mock('../../utils/confirm', () => ({ confirmAction: jest.fn(async () => true) }));

const T0 = '2026-11-12T10:00:00.000Z';
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

const navRef = createNavigationContainerRef();

async function renderWorkout() {
  await render(
    <ThemeProvider>
      <NavigationContainer ref={navRef}>
        <WorkoutStack />
      </NavigationContainer>
    </ThemeProvider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queue.__resetForTests();
  useRoutineStore.getState().reset();
  useRoutineStore.setState({ routines: { tpl: template }, routineExercises: { 'tpl-1': templateRow } });
  useExerciseStore.setState({ items: exercises, lastFetchedAt: Date.now(), status: 'ready' });
  useAuthStore.setState({ status: 'signedIn', user: { id: 'user-1' } });
});

describe('RoutineListScreen', () => {
  it('shows an empty "my routines" state and the starter routines', async () => {
    await renderWorkout();
    expect(await screen.findByTestId('my-routines-empty')).toBeTruthy();
    expect(screen.getByText('Starter routines')).toBeTruthy();
    expect(within(screen.getByTestId('routine-card-tpl')).getAllByText('Full Body').length).toBeGreaterThan(0);
    expect(syncNow).toHaveBeenCalled();
  });

  it('shows a loading state on first launch while syncing', async () => {
    useRoutineStore.getState().reset();
    syncNow.mockReturnValueOnce(new Promise(() => {}));
    await renderWorkout();
    expect(screen.getByText('Loading routines…')).toBeTruthy();
  });

  it('shows an error with retry on first launch when offline', async () => {
    useRoutineStore.getState().reset();
    syncNow.mockResolvedValueOnce({ ok: false, offline: true });
    await renderWorkout();
    expect(await screen.findByText("Couldn't load routines")).toBeTruthy();
    expect(screen.getByText(/offline/)).toBeTruthy();
  });
});

describe('creating a routine', () => {
  it('validates the name, adds exercises from the picker, edits targets and saves offline-first', async () => {
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('new-routine'));
    await screen.findByTestId('routine-builder-screen');
    expect(screen.getByTestId('day-empty')).toBeTruthy();

    // Name is required.
    await fireEvent.press(screen.getByTestId('save-routine'));
    expect(screen.getByText('Give your routine a name.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('routine-name'), 'Push day');

    // Pick two exercises.
    await fireEvent.press(screen.getByTestId('add-exercises'));
    await screen.findByTestId('exercise-picker-screen');
    await fireEvent.press(screen.getByTestId('pick-bench'));
    await fireEvent.press(screen.getByTestId('pick-plank'));
    expect(screen.getByTestId('picker-done')).toHaveTextContent('Add 2 exercises');
    await fireEvent.press(screen.getByTestId('picker-done'));

    await screen.findByTestId('routine-builder-screen');
    expect(screen.getByText('1. Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('2. Plank')).toBeTruthy();
    expect(screen.getByText('Seconds min')).toBeTruthy(); // timed exercise uses seconds

    // Bump sets 3 -> 4 for bench.
    await fireEvent.press(screen.getByTestId('item-0-sets-inc'));
    expect(screen.getByTestId('item-0-sets-value')).toHaveTextContent('4');

    await fireEvent.press(screen.getByTestId('save-routine'));
    const card = await screen.findByText('Push day');
    expect(card).toBeTruthy();
    expect(screen.queryByTestId('my-routines-empty')).toBeNull();

    // Saved locally and queued for sync: routine first, then its exercises.
    const q = await queue.getAll();
    expect(q.map((e) => e.table)).toEqual(['routines', 'routine_exercises', 'routine_exercises']);
    expect(q[1].payload).toMatchObject({ exercise_id: 'bench', target_sets: 4, position: 0 });
  });

  it('supports multiple days', async () => {
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('new-routine'));
    await fireEvent.changeText(await screen.findByTestId('routine-name'), 'Upper/Lower');
    await fireEvent.changeText(screen.getByTestId('day-name'), 'Upper');
    await fireEvent.press(screen.getByTestId('add-day'));
    expect(screen.getByTestId('day-name').props.value).toBe('Day 2');
    await fireEvent.changeText(screen.getByTestId('day-name'), 'Lower');
    await fireEvent.press(screen.getByTestId('save-routine'));
    await screen.findByTestId('routine-list-screen');
    const mine = Object.values(useRoutineStore.getState().routines).find((r) => r.user_id);
    expect(mine.days).toEqual(['Upper', 'Lower']);
  });
});

describe('starter routines', () => {
  it('previews read-only and copies into my routines', async () => {
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('routine-card-tpl'));
    expect(await screen.findByText('Use this routine')).toBeTruthy();
    expect(screen.queryByTestId('routine-name')).toBeNull(); // read-only
    expect(screen.getByText(/3 sets × 8–12 reps/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('use-template'));
    expect(await screen.findByTestId('routine-name')).toBeTruthy(); // now editing the copy
    const copy = Object.values(useRoutineStore.getState().routines).find((r) => r.user_id);
    expect(copy).toMatchObject({ name: 'Full Body', source_template_id: 'tpl' });
  });
});

describe('editing and deleting', () => {
  it('removes an exercise, saves, then deletes the routine after confirmation', async () => {
    const id = await useRoutineStore.getState().copyTemplate('tpl', { userId: 'user-1', now: T0 });
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId(`routine-card-${id}`));
    await screen.findByText('1. Back Squat');

    await fireEvent.press(screen.getByTestId('item-0-remove'));
    expect(screen.getByTestId('day-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-routine'));
    await screen.findByTestId('routine-list-screen');

    await fireEvent.press(screen.getByTestId(`routine-card-${id}`));
    await fireEvent.press(await screen.findByTestId('delete-routine'));
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete routine?' }));
    expect(await screen.findByTestId('my-routines-empty')).toBeTruthy();
    expect(useRoutineStore.getState().routines[id].deleted_at).toBeTruthy();
  });

  it('asks before discarding unsaved changes', async () => {
    confirmAction.mockResolvedValueOnce(false);
    await renderWorkout();
    await fireEvent.press(await screen.findByTestId('new-routine'));
    await fireEvent.changeText(await screen.findByTestId('routine-name'), 'Unsaved');
    await act(async () => navRef.goBack()); // same as the header back button / Android back
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard changes?' }));
    expect(screen.getByTestId('routine-builder-screen')).toBeTruthy(); // stayed
  });
});
